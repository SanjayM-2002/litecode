// Package heartbeat publishes worker liveness to Redis.
//
// The API can't health-check the judge directly: workers run on a separate
// machine, have no HTTP server, and execute untrusted code — opening a network
// path from the API toward them would be the wrong direction. So each worker
// pushes a key with a TTL slightly longer than its interval, and a stopped
// worker simply expires.
//
// Read by GET /health/deep in backend-core. The key format must stay in sync
// with cacheKeys.judgeHeartbeat() in packages/cache/src/cache.keys.ts.
package heartbeat

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	keyPrefix = "judge:heartbeat:v1:"
	interval  = 10 * time.Second
	// Longer than the interval so a single slow tick doesn't look like death,
	// short enough that a stopped worker disappears promptly.
	ttl = 30 * time.Second
)

// Beat is the JSON payload. Field names match the Heartbeat interface in
// apps/backend-core/src/health/indicators/judge.indicator.ts.
type Beat struct {
	WorkerID string `json:"workerId"`
	Sandbox  string `json:"sandbox"`
	Slots    int    `json:"slots"`
	TS       string `json:"ts"` // RFC3339
}

type Reporter struct {
	rdb  *redis.Client
	beat Beat
	key  string
	log  *slog.Logger
}

// New returns nil (with no error) when redisURL is empty — the worker runs
// fine without heartbeats, it just won't show up in /health/deep.
func New(redisURL, sandbox string, slots int, log *slog.Logger) (*Reporter, error) {
	if redisURL == "" {
		log.Warn("REDIS_URL not set — worker will not report heartbeats and will show as down in /health/deep")
		return nil, nil
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}

	host, _ := os.Hostname()
	id := fmt.Sprintf("%s-%d", host, os.Getpid())

	return &Reporter{
		rdb: redis.NewClient(opts),
		key: keyPrefix + id,
		beat: Beat{
			WorkerID: id,
			Sandbox:  sandbox,
			Slots:    slots,
		},
		log: log,
	}, nil
}

// Run publishes immediately, then on a ticker, until ctx is cancelled.
func (r *Reporter) Run(ctx context.Context) {
	if r == nil {
		return
	}
	r.publish(ctx)

	t := time.NewTicker(interval)
	defer t.Stop()

	for {
		select {
		case <-ctx.Done():
			// Remove the key on clean shutdown so the worker disappears from
			// health immediately rather than lingering for the TTL.
			delCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
			if err := r.rdb.Del(delCtx, r.key).Err(); err != nil {
				r.log.Debug("heartbeat cleanup failed", "err", err)
			}
			cancel()
			_ = r.rdb.Close()
			return
		case <-t.C:
			r.publish(ctx)
		}
	}
}

func (r *Reporter) publish(ctx context.Context) {
	r.beat.TS = time.Now().UTC().Format(time.RFC3339)

	payload, err := json.Marshal(r.beat)
	if err != nil {
		r.log.Error("marshal heartbeat", "err", err)
		return
	}

	// Best effort. A failed heartbeat must never affect grading — it only
	// makes this worker look absent for one interval.
	if err := r.rdb.Set(ctx, r.key, payload, ttl).Err(); err != nil {
		r.log.Warn("heartbeat publish failed", "key", r.key, "err", err)
		return
	}
	r.log.Debug("heartbeat published", "key", r.key, "ttl", ttl)
}
