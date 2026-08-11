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

func Checkpoint(log *slog.Logger, step int, name string, attrs ...any) {
	args := append([]any{"step", step, "stage", name}, attrs...)
	log.Debug("CHECKPOINT", args...)
}

const TotalCheckpoints = 10
