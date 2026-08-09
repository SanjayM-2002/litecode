// Package logging wires up slog and provides the numbered CHECKPOINT helper
// used to trace a submission end-to-end during development.
package logging

import (
	"log/slog"
	"os"
	"strings"
)

func Setup(level, format string) *slog.Logger {
	var lv slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lv = slog.LevelDebug
	case "warn":
		lv = slog.LevelWarn
	case "error":
		lv = slog.LevelError
	default:
		lv = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{Level: lv}

	var h slog.Handler
	if strings.ToLower(format) == "json" {
		h = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		h = slog.NewTextHandler(os.Stdout, opts)
	}

	l := slog.New(h)
	slog.SetDefault(l)
	return l
}

// Checkpoint emits a numbered, greppable trace line for one stage of grading.
// Every submission produces the same sequence of these, so a run that stops
// early tells you exactly which stage broke:
//
//	grep CHECKPOINT judge.log | grep sub_01HX
//
// Kept at Debug so production stays quiet.
func Checkpoint(log *slog.Logger, step int, name string, attrs ...any) {
	args := append([]any{"step", step, "stage", name}, attrs...)
	log.Debug("CHECKPOINT", args...)
}

// Total number of checkpoints in a full grading run. Handy in tests: if you
// saw fewer than this and no error, something returned early silently.
const TotalCheckpoints = 10
