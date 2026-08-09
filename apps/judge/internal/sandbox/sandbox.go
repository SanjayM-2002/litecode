// Package sandbox isolates and measures the execution of untrusted code.
//
// Nothing in this package may import a litecode type. It takes a command,
// limits and stdin, and returns measured facts — so it stays liftable into a
// standalone library later.
package sandbox

import (
	"context"
	"io"
	"os"
	"time"
)

// Status is an execution outcome, NOT a verdict. "OK" means the program ran
// cleanly; whether its output was correct is decided elsewhere.
type Status string

const (
	StatusOK       Status = "OK"
	StatusTLE      Status = "TLE"
	StatusMLE      Status = "MLE"
	StatusRE       Status = "RE"
	StatusOLE      Status = "OLE"
	StatusInternal Status = "INTERNAL"
)

type Spec struct {
	Argv []string
	Env  []string

	CPUTime  time.Duration // hard CPU deadline
	WallTime time.Duration // catches sleep() and blocking reads, which burn no CPU
	MemKB    int
	MaxProcs int // fork-bomb ceiling
	FSizeKB  int

	// StdinFile is relative to Box.Dir(). Empty means no stdin.
	StdinFile string

	// BindDirs are extra read-only mounts, "inside=outside:opts". Used to hand
	// large cached test cases to the program without copying them.
	BindDirs []string

	OutCapKB int
}

type Result struct {
	Status    Status
	ExitCode  int
	Signal    int
	CPUTime   time.Duration
	WallTime  time.Duration
	PeakMemKB int
	Stdout    []byte
	Stderr    []byte
	Truncated bool
	Message   string
}

// Sandbox hands out isolated workspaces. One Box per concurrency slot.
type Sandbox interface {
	Open(ctx context.Context, slot int) (Box, error)
	// Name identifies the implementation in logs and in the result payload.
	Name() string
}

// Box is a workspace you write files into and then execute inside.
type Box interface {
	// Dir is the writable working directory, as seen from the judge process.
	Dir() string
	Run(ctx context.Context, spec Spec) (Result, error)
	Close(ctx context.Context) error
}

// Scrub removes everything in dir except the named files. Reusing one box
// across chunks means the filesystem persists even though the process does
// not — without this, chunk N can read a file chunk N-1 wrote, which is the
// one channel through which per-chunk execution still leaks state.
func Scrub(dir string, keep ...string) error {
	kept := make(map[string]bool, len(keep))
	for _, k := range keep {
		kept[k] = true
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if kept[e.Name()] {
			continue
		}
		if err := os.RemoveAll(dir + "/" + e.Name()); err != nil {
			return err
		}
	}
	return nil
}

// readCapped reads at most max bytes and reports whether it hit the cap. A
// program printing in an infinite loop must not be able to fill memory or disk.
func readCapped(path string, max int) (data []byte, truncated bool, err error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, false, nil
		}
		return nil, false, err
	}
	defer f.Close()

	buf := make([]byte, max+1)
	n, err := io.ReadFull(f, buf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return nil, false, err
	}
	if n > max {
		return buf[:max], true, nil
	}
	return buf[:n], false, nil
}
