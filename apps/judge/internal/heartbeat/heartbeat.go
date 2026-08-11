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
	ttl       = 30 * time.Second
)

type Beat struct {
	WorkerID string `json:"workerId"`
	Sandbox  string `json:"sandbox"`
	Slots    int    `json:"slots"`
	TS       string `json:"ts"`
}

type Reporter struct {
	rdb  *redis.Client
	beat Beat
	key  string
	log  *slog.Logger
}

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
	if err := r.rdb.Set(ctx, r.key, payload, ttl).Err(); err != nil {
		r.log.Warn("heartbeat publish failed", "key", r.key, "err", err)
		return
	}
	r.log.Debug("heartbeat published", "key", r.key, "ttl", ttl)
}
