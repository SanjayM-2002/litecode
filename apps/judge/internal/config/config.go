// Package config loads and validates all runtime configuration from the
// environment. Everything is validated at boot: a judge that silently starts
// with no memory limit is worse than one that refuses to start.
package config

import (
	"fmt"
	"os"
	"strconv"
)

type SandboxKind string

const (
	SandboxIsolate SandboxKind = "isolate"
	// SandboxLocal provides NO isolation whatsoever. It exists so the queue,
	// database, planning and comparison paths can be developed on macOS, where
	// namespaces and cgroups do not exist.
	SandboxLocal SandboxKind = "local"
)

type Config struct {
	DatabaseURL string
	AMQPURL     string
	QueueName   string

	// Optional. Used for worker heartbeats (and later, busting the user's
	// solved-map cache when a verdict lands). The worker runs without it.
	RedisURL string

	Sandbox     SandboxKind
	IsolateBin  string
	Concurrency int

	CppIncludeDir string
	CacheDir      string

	LogLevel  string
	LogFormat string
}

func Load() (*Config, error) {
	c := &Config{
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		AMQPURL:       os.Getenv("AMQP_URL"),
		QueueName:     envOr("JUDGE_QUEUE", "judge.jobs.default"),
		RedisURL:      os.Getenv("REDIS_URL"),
		Sandbox:       SandboxKind(envOr("JUDGE_SANDBOX", "local")),
		IsolateBin:    envOr("ISOLATE_BIN", "/usr/local/bin/isolate"),
		CppIncludeDir: envOr("CPP_INCLUDE_DIR", "/opt/judge/pch"),
		CacheDir:      envOr("CACHE_DIR", os.TempDir()+"/judge-cache"),
		LogLevel:      envOr("LOG_LEVEL", "info"),
		LogFormat:     envOr("LOG_FORMAT", "text"),
	}

	n, err := strconv.Atoi(envOr("JUDGE_CONCURRENCY", "3"))
	if err != nil || n < 1 {
		return nil, fmt.Errorf("JUDGE_CONCURRENCY must be a positive integer, got %q",
			os.Getenv("JUDGE_CONCURRENCY"))
	}
	c.Concurrency = n

	if c.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if c.AMQPURL == "" {
		return nil, fmt.Errorf("AMQP_URL is required")
	}
	switch c.Sandbox {
	case SandboxIsolate, SandboxLocal:
	default:
		return nil, fmt.Errorf("JUDGE_SANDBOX must be %q or %q, got %q",
			SandboxIsolate, SandboxLocal, c.Sandbox)
	}

	return c, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
