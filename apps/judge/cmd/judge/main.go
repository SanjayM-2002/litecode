// Command judge is the litecode code-execution worker.
//
// It consumes grading jobs from RabbitMQ, executes untrusted submissions in
// isolated sandboxes, and writes verdicts straight to Postgres. Writing the
// verdict itself — rather than mailing it back — is what keeps "was this
// graded?" answerable from a row that cannot be consumed and destroyed.
package main

import (
	"context"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"github.com/SanjayM-2002/litecode/apps/judge/internal/cache"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/config"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/db"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/grader"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/heartbeat"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/logging"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/queue"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/sandbox"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		// Logging isn't up yet, so this is the one place we use stderr directly.
		os.Stderr.WriteString("config error: " + err.Error() + "\n")
		os.Exit(1)
	}

	log := logging.Setup(cfg.LogLevel, cfg.LogFormat)
	log.Info("judge starting",
		"sandbox", cfg.Sandbox,
		"concurrency", cfg.Concurrency,
		"queue", cfg.QueueName,
		"host_cpus", runtime.NumCPU(),
		"go", runtime.Version(),
		"os", runtime.GOOS+"/"+runtime.GOARCH)

	// Sandboxes are CPU-bound; oversubscribing cores inflates every measured
	// runtime and turns correct solutions into TLEs.
	if cfg.Concurrency > runtime.NumCPU()-1 {
		log.Warn("concurrency is close to the core count — measured runtimes will be unreliable",
			"concurrency", cfg.Concurrency, "cores", runtime.NumCPU(),
			"suggested", runtime.NumCPU()-2)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Pool must exceed sandbox concurrency, or goroutines queue for a
	// connection — the one way the verdict write genuinely blocks grading.
	database, err := db.Open(ctx, cfg.DatabaseURL, int32(cfg.Concurrency+2))
	if err != nil {
		log.Error("database unavailable", "err", err)
		os.Exit(1)
	}
	defer database.Close()
	log.Info("postgres connected")

	var sb sandbox.Sandbox
	switch cfg.Sandbox {
	case config.SandboxIsolate:
		iso := sandbox.NewIsolate(cfg.IsolateBin, log)
		// Fail here, loudly, rather than on the first submission — where the
		// same error would surface as a dead-lettered job and read like a
		// grading bug instead of a broken environment.
		if err := iso.Preflight(ctx); err != nil {
			log.Error("isolate preflight failed — refusing to start", "err", err,
				"hint", "needs --privileged and cgroup access; try `make shell` then `isolate --cg --box-id=0 --init`")
			os.Exit(1)
		}
		sb = iso
	default:
		sb = sandbox.NewLocal(log)
	}

	// Separate connection from the heartbeat reporter's: this one is on the
	// grading path and shares its lifetime, the other is a background ticker.
	cch, err := cache.New(cfg.RedisURL, log)
	if err != nil {
		log.Error("redis setup failed", "err", err)
		os.Exit(1)
	}
	defer cch.Close()

	slots := grader.NewSlots(cfg.Concurrency)
	g := grader.New(database, sb, slots, cch, cfg.CppIncludeDir, log)

	// Liveness for GET /health/deep. Best effort — a failure here never
	// affects grading, it only makes this worker look absent.
	hb, err := heartbeat.New(cfg.RedisURL, string(cfg.Sandbox), cfg.Concurrency, log)
	if err != nil {
		log.Error("heartbeat setup failed", "err", err)
		os.Exit(1)
	}
	go hb.Run(ctx)

	consumer := queue.New(cfg.AMQPURL, cfg.QueueName, cfg.Concurrency, log)

	log.Info("judge ready", "sandbox", sb.Name(), "slots", slots.Available())

	if err := consumer.Run(ctx, g.Grade); err != nil {
		log.Error("consumer stopped", "err", err)
		os.Exit(1)
	}

	log.Info("judge stopped cleanly")
}
