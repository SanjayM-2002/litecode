package config

import (
	"fmt"
	"os"
	"strconv"
)

type SandboxKind string

const (
	SandboxIsolate SandboxKind = "isolate"
	SandboxLocal   SandboxKind = "local"
)

type Config struct {
	DatabaseURL string
	AMQPURL     string
	QueueName   string

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
