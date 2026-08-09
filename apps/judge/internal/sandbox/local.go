package sandbox

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
)

// Local runs code with NO ISOLATION WHATSOEVER.
//
// It exists so the queue, database, chunk-planning and comparison paths can be
// developed on macOS, where namespaces and cgroups do not exist. It cannot
// enforce a memory limit, cannot stop a fork bomb, and cannot be trusted with
// anything you did not write yourself.
//
// Never set JUDGE_SANDBOX=local anywhere a real user can submit code.
type Local struct{ log *slog.Logger }

func NewLocal(log *slog.Logger) *Local {
	log.Warn("SANDBOX=local — NO ISOLATION. Development only; never expose this to user submissions.")
	return &Local{log: log}
}

func (l *Local) Name() string { return "local" }

func (l *Local) Open(ctx context.Context, slot int) (Box, error) {
	dir, err := os.MkdirTemp("", fmt.Sprintf("judge-box-%d-", slot))
	if err != nil {
		return nil, fmt.Errorf("create local box: %w", err)
	}
	l.log.Debug("local box opened", "slot", slot, "dir", dir)
	return &localBox{dir: dir, log: l.log}, nil
}

type localBox struct {
	dir string
	log *slog.Logger
}

func (b *localBox) Dir() string                   { return b.dir }
func (b *localBox) Close(_ context.Context) error { return os.RemoveAll(b.dir) }

func (b *localBox) Run(ctx context.Context, s Spec) (Result, error) {
	// Only the wall clock is enforceable here. There is no CPU deadline, no
	// memory cap and no process cap.
	ctx, cancel := context.WithTimeout(ctx, s.WallTime)
	defer cancel()

	cmd := exec.CommandContext(ctx, s.Argv[0], s.Argv[1:]...)
	cmd.Dir = b.dir
	cmd.Env = append(os.Environ(), s.Env...)

	if s.StdinFile != "" {
		f, err := os.Open(filepath.Join(b.dir, s.StdinFile))
		if err != nil {
			return Result{}, fmt.Errorf("open stdin %s: %w", s.StdinFile, err)
		}
		defer f.Close()
		cmd.Stdin = f
	}

	stdout, err := os.Create(filepath.Join(b.dir, "stdout.txt"))
	if err != nil {
		return Result{}, err
	}
	defer stdout.Close()
	stderr, err := os.Create(filepath.Join(b.dir, "stderr.txt"))
	if err != nil {
		return Result{}, err
	}
	defer stderr.Close()
	cmd.Stdout, cmd.Stderr = stdout, stderr

	b.log.Debug("local run", "argv", s.Argv, "wall_ms", s.WallTime.Milliseconds())

	started := time.Now()
	runErr := cmd.Run()
	wall := time.Since(started)

	res := Result{WallTime: wall, Status: StatusOK}

	// getrusage gives real per-process CPU time and peak RSS even without
	// cgroups — approximate, but enough to develop against.
	if ru, ok := cmd.ProcessState.SysUsage().(*syscall.Rusage); ok {
		res.CPUTime = time.Duration(ru.Utime.Nano() + ru.Stime.Nano())
		res.PeakMemKB = maxRSSKB(ru)
	}

	switch {
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		res.Status, res.Message = StatusTLE, "wall clock limit exceeded"
	case runErr != nil:
		var ee *exec.ExitError
		if errors.As(runErr, &ee) {
			res.ExitCode = ee.ExitCode()
			if ws, ok := ee.Sys().(syscall.WaitStatus); ok && ws.Signaled() {
				res.Signal = int(ws.Signal())
			}
			res.Status = StatusRE
			res.Message = fmt.Sprintf("exited with code %d", res.ExitCode)
		} else {
			res.Status, res.Message = StatusInternal, runErr.Error()
		}
	}

	capBytes := s.OutCapKB << 10
	res.Stdout, res.Truncated, _ = readCapped(filepath.Join(b.dir, "stdout.txt"), capBytes)
	res.Stderr, _, _ = readCapped(filepath.Join(b.dir, "stderr.txt"), 16<<10)
	if res.Truncated && res.Status == StatusOK {
		res.Status, res.Message = StatusOLE, "output limit exceeded"
	}

	b.log.Debug("local result", "status", res.Status,
		"cpu_ms", res.CPUTime.Milliseconds(), "peak_mem_kb", res.PeakMemKB,
		"exit", res.ExitCode)

	return res, nil
}
