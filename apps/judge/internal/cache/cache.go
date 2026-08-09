// Package cache invalidates the Redis entries a verdict makes stale.
//
// ══════════════════════════════════════════════════════════════════════════
// THESE KEY FORMATS ARE DUPLICATED FROM packages/cache/src/cache.keys.ts.
// Nothing enforces that they match. If you bump a version segment there —
// `problem:v2` → `problem:v3` — you MUST change it here too, or this worker
// will cheerfully delete keys nobody reads and the API will serve stale
// problem data forever, with no error anywhere to tell you.
// A golden test in packages/cache asserts these literals for that reason.
// ══════════════════════════════════════════════════════════════════════════
//
// Everything here is best effort. A failed invalidation is bounded by the
// entry's TTL, so it must never fail a verdict that is already committed.
package cache

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/redis/go-redis/v9"
)

const (
	userSolvedMapFmt    = "user:%s:solved-map"
	problemBySlugFmt    = "problem:v2:%s"
	problemsListPattern = "problems:list:v2:*"
)

type Client struct {
	rdb *redis.Client
	log *slog.Logger
}

// New returns nil (and no error) when redisURL is empty. A nil *Client is a
// working no-op, so the judge still grades without Redis — it just leaves
// stale reads to expire on their own.
func New(redisURL string, log *slog.Logger) (*Client, error) {
	if redisURL == "" {
		log.Warn("REDIS_URL not set — verdicts will not invalidate caches; " +
			"solved flags and acceptance rates will be stale until TTL")
		return nil, nil
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	return &Client{rdb: redis.NewClient(opts), log: log}, nil
}

func (c *Client) Close() {
	if c == nil {
		return
	}
	_ = c.rdb.Close()
}

// AfterVerdict drops everything a completed submission invalidates:
//
//   - the user's solved/attempted map, because this submission may have just
//     changed a flag on it
//   - the problem detail and every page of the problem list, because both bake
//     in totalSubmissions and the acceptance rate we just incremented
//
// Never returns an error. The verdict is already durable at this point, and
// re-running the grading because a DEL failed would be worse than a stale read.
func (c *Client) AfterVerdict(ctx context.Context, userID, problemSlug string) {
	if c == nil {
		return
	}

	if userID != "" {
		key := fmt.Sprintf(userSolvedMapFmt, userID)
		if err := c.rdb.Del(ctx, key).Err(); err != nil {
			c.log.Warn("cache invalidation failed", "key", key, "err", err)
		}
	}

	if problemSlug != "" {
		key := fmt.Sprintf(problemBySlugFmt, problemSlug)
		if err := c.rdb.Del(ctx, key).Err(); err != nil {
			c.log.Warn("cache invalidation failed", "key", key, "err", err)
		}
	}

	c.delPattern(ctx, problemsListPattern)
}

// delPattern removes every key matching a glob.
//
// SCAN, never KEYS: KEYS walks the entire keyspace in one blocking call, which
// on a shared Redis stalls every other client. SCAN is incremental and may
// return duplicates, which does not matter for deletion.
func (c *Client) delPattern(ctx context.Context, pattern string) {
	var n int
	iter := c.rdb.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		if err := c.rdb.Del(ctx, iter.Val()).Err(); err != nil {
			c.log.Warn("cache invalidation failed", "key", iter.Val(), "err", err)
			return
		}
		n++
	}
	if err := iter.Err(); err != nil {
		c.log.Warn("cache scan failed", "pattern", pattern, "err", err)
		return
	}
	c.log.Debug("cache pattern invalidated", "pattern", pattern, "deleted", n)
}
