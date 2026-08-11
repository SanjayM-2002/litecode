package sandbox

import (
	"context"
	"io"
	"os"
	"time"
)

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
	Argv      []string
	Env       []string
	CPUTime   time.Duration // hard CPU deadline
	WallTime  time.Duration // catches sleep() and blocking reads, which burn no CPU
	MemKB     int
	MaxProcs  int // fork-bomb ceiling
	FSizeKB   int
	StdinFile string
	BindDirs  []string
	OutCapKB  int
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

type Sandbox interface {
	Open(ctx context.Context, slot int) (Box, error)
	Name() string
}

type Box interface {
	Dir() string
	Run(ctx context.Context, spec Spec) (Result, error)
	Close(ctx context.Context) error
}

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
