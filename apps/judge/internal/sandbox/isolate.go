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

// Isolate shells out to the `isolate` binary (github.com/ioi/isolate) — the
// sandbox that runs the IOI. It is Linux-only at RUNTIME, but this file needs
// no build tag because it only ever calls exec: everything Linux-specific
// lives inside the isolate binary, not in our syscalls.
type Isolate struct {
	bin string
	log *slog.Logger
}

func NewIsolate(bin string, log *slog.Logger) *Isolate {
	return &Isolate{bin: bin, log: log}
}

func (i *Isolate) Name() string { return "isolate" }

// execErr makes an isolate failure diagnosable.
//
// *exec.ExitError formats as bare "exit status 2". Isolate's actual complaint
// — "Cannot create control group: Permission denied", "Cannot access
// /sys/fs/cgroup" — goes to stderr, and %w drops it entirely. That message IS
// the diagnosis for every privilege and cgroup problem, which is the whole
// category of thing that goes wrong when running this inside a container.
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

// Preflight proves the sandbox actually works, at startup, before any
// submission depends on it.
//
// Without this the worker logs "judge ready", sits happily on the queue, and
// the first real submission dies inside a dead-letter — where the failure
// looks like a grading bug rather than a broken environment. Under Docker,
// cgroup delegation is the thing most likely to be wrong, and it is wrong
// identically for every submission, so failing at boot is strictly better.
func (i *Isolate) Preflight(ctx context.Context) error {
	ver, err := exec.CommandContext(ctx, i.bin, "--version").Output()
	if err != nil {
		return execErr("isolate --version", err, nil)
	}
	i.log.Info("isolate found", "version", strings.TrimSpace(string(ver)), "bin", i.bin)

	// A full init/cleanup round-trip on box 0. This is what exercises cgroup
	// creation — the part --version cannot tell you anything about.
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
	// isolate boxes are NUMBERED and not reentrant. Two goroutines sharing a
	// box id is a real and very confusing bug, so the id comes from the
	// concurrency slot, never from a counter.
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
	// A leaked box holds a cgroup and a uid, and you run out after a few
	// hundred. The caller must run this even on a cancelled context.
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
		// Suppress isolate's "OK (0.001 sec real...)" status line, which it
		// writes to STDERR on every successful run. Fatal errors are still
		// printed, so the stderr check below stays meaningful.
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
	// The program's own stderr goes to stderr.txt inside the box via --stderr,
	// so this buffer only ever catches isolate's own diagnostics.
	var isolateErr bytes.Buffer
	cmd := exec.CommandContext(ctx, b.bin, args...)
	cmd.Stderr = &isolateErr
	runErr := cmd.Run()

	// isolate's own exit code: 0 = program ran clean, 1 = the program failed
	// (RE/SG/TO — normal, described in the meta file), 2 = isolate itself
	// broke. Treating 1 as an error would make every TLE look like an engine
	// failure.
	var ee *exec.ExitError
	if errors.As(runErr, &ee) && ee.ExitCode() >= 2 {
		return Result{}, execErr(fmt.Sprintf("isolate --run box=%d", b.id), runErr, isolateErr.Bytes())
	}
	if s := strings.TrimSpace(isolateErr.String()); s != "" {
		// Exit 0 or 1 with output on stderr: not fatal, but isolate only talks
		// when something is off (a limit it couldn't apply, a missing cgroup
		// controller). Silently dropping it hides misconfiguration.
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

// parseMeta reads isolate's key:value meta file:
//
//	time:0.084  time-wall:0.092  cg-mem:12480
//	cg-oom-killed:1  exitcode:0  exitsig:9  status:SG  message:...
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
	// OOM MUST be checked first. An OOM kill arrives as status:SG exitsig:9,
	// which is indistinguishable from the SIGKILL the time limit sends. Check
	// the cgroup flag or you report MLE as TLE — exactly the Piston failure
	// mode this engine exists to fix.
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
