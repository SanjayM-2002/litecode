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
