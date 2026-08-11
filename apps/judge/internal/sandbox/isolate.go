package sandbox

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Isolate struct {
	bin string
	log *slog.Logger
}

func NewIsolate(bin string, log *slog.Logger) *Isolate {
	return &Isolate{bin: bin, log: log}
}

func (i *Isolate) Name() string { return "isolate" }

func execErr(op string, err error, stderr []byte) error {
	var ee *exec.ExitError
	if errors.As(err, &ee) && len(ee.Stderr) > 0 {
		stderr = ee.Stderr
	}
	if s := strings.TrimSpace(string(stderr)); s != "" {
		return fmt.Errorf("%s: %w: %s", op, err, s)
	}
	return fmt.Errorf("%s: %w (isolate printed nothing)", op, err)
}

func (i *Isolate) Preflight(ctx context.Context) error {
	ver, err := exec.CommandContext(ctx, i.bin, "--version").Output()
	if err != nil {
		return execErr("isolate --version", err, nil)
	}
	i.log.Info("isolate found", "version", strings.TrimSpace(string(ver)), "bin", i.bin)

	box, err := i.Open(ctx, 0)
	if err != nil {
		return fmt.Errorf("sandbox is not usable: %w", err)
	}
	if err := box.Close(ctx); err != nil {
		return fmt.Errorf("box opened but cleanup failed: %w", err)
	}
	i.log.Info("isolate preflight passed", "box_root", box.Dir())
	return nil
}

func (i *Isolate) Open(ctx context.Context, slot int) (Box, error) {
	out, err := exec.CommandContext(ctx, i.bin,
		"--cg", fmt.Sprintf("--box-id=%d", slot), "--init").Output()
	if err != nil {
		return nil, execErr(fmt.Sprintf("isolate --init box=%d", slot), err, nil)
	}
	root := strings.TrimSpace(string(out))
	i.log.Debug("isolate box opened", "slot", slot, "root", root)
	return &isolateBox{bin: i.bin, id: slot, root: root, log: i.log}, nil
}

type isolateBox struct {
	bin  string
	id   int
	root string
	log  *slog.Logger
}

func (b *isolateBox) Dir() string { return filepath.Join(b.root, "box") }

func (b *isolateBox) Close(ctx context.Context) error {
	out, err := exec.CommandContext(ctx, b.bin,
		"--cg", fmt.Sprintf("--box-id=%d", b.id), "--cleanup").CombinedOutput()
	if err != nil {
		return execErr(fmt.Sprintf("isolate --cleanup box=%d", b.id), err, out)
	}
	return nil
}

func (b *isolateBox) Run(ctx context.Context, s Spec) (Result, error) {
	metaPath := filepath.Join(b.root, "meta.txt")

	args := []string{
		"--cg",
		"--silent",
		fmt.Sprintf("--box-id=%d", b.id),
		fmt.Sprintf("--meta=%s", metaPath),
		fmt.Sprintf("--time=%.3f", s.CPUTime.Seconds()),
		fmt.Sprintf("--wall-time=%.3f", s.WallTime.Seconds()),
		"--extra-time=0.5", // grace before SIGKILL, so we can read the meta file
		fmt.Sprintf("--cg-mem=%d", s.MemKB),
		fmt.Sprintf("--processes=%d", s.MaxProcs),
		fmt.Sprintf("--fsize=%d", s.FSizeKB),
		"--stdout=stdout.txt",
		"--stderr=stderr.txt",
	}
	if s.StdinFile != "" {
		args = append(args, "--stdin="+s.StdinFile)
	}
	for _, d := range s.BindDirs {
		args = append(args, "--dir="+d)
	}
	for _, e := range s.Env {
		args = append(args, "--env="+e)
	}
	args = append(args, "--run", "--")
	args = append(args, s.Argv...)

	b.log.Debug("isolate run", "box", b.id, "argv", s.Argv,
		"cpu_ms", s.CPUTime.Milliseconds(), "mem_kb", s.MemKB)

	started := time.Now()
	var isolateErr bytes.Buffer
	cmd := exec.CommandContext(ctx, b.bin, args...)
	cmd.Stderr = &isolateErr
	runErr := cmd.Run()
	var ee *exec.ExitError
	if errors.As(runErr, &ee) && ee.ExitCode() >= 2 {
		return Result{}, execErr(fmt.Sprintf("isolate --run box=%d", b.id), runErr, isolateErr.Bytes())
	}
	if s := strings.TrimSpace(isolateErr.String()); s != "" {
		b.log.Warn("isolate wrote to stderr", "box", b.id, "msg", s)
	}

	meta, err := parseMeta(metaPath)
	if err != nil {
		return Result{}, fmt.Errorf("read isolate meta: %w", err)
	}

	res := Result{
		CPUTime:   secs(meta["time"]),
		WallTime:  secs(meta["time-wall"]),
		PeakMemKB: atoi(meta["cg-mem"]),
		ExitCode:  atoi(meta["exitcode"]),
		Signal:    atoi(meta["exitsig"]),
	}
	if res.WallTime == 0 {
		res.WallTime = time.Since(started)
	}
	res.Status, res.Message = classify(meta)

	capBytes := s.OutCapKB << 10
	res.Stdout, res.Truncated, _ = readCapped(filepath.Join(b.Dir(), "stdout.txt"), capBytes)
	res.Stderr, _, _ = readCapped(filepath.Join(b.Dir(), "stderr.txt"), 16<<10)
	if res.Truncated && res.Status == StatusOK {
		res.Status = StatusOLE
		res.Message = "output limit exceeded"
	}

	b.log.Debug("isolate result", "box", b.id, "status", res.Status,
		"cpu_ms", res.CPUTime.Milliseconds(), "peak_mem_kb", res.PeakMemKB,
		"exit", res.ExitCode, "signal", res.Signal)

	return res, nil
}

func parseMeta(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	m := map[string]string{}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		if k, v, ok := strings.Cut(sc.Text(), ":"); ok {
			m[k] = v
		}
	}
	return m, sc.Err()
}

func classify(m map[string]string) (Status, string) {
	if m["cg-oom-killed"] == "1" {
		return StatusMLE, "memory limit exceeded"
	}

	switch m["status"] {
	case "": // isolate omits `status` entirely on success
		return StatusOK, ""
	case "TO":
		return StatusTLE, m["message"]
	case "SG":
		return StatusRE, "killed by signal " + m["exitsig"]
	case "RE":
		return StatusRE, "exited with code " + m["exitcode"]
	case "XX":
		return StatusInternal, m["message"]
	}
	return StatusInternal, "unknown isolate status " + m["status"]
}

func secs(v string) time.Duration {
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return 0
	}
	return time.Duration(f * float64(time.Second))
}

func atoi(v string) int {
	n, _ := strconv.Atoi(v)
	return n
}
