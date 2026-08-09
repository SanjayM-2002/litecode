// Shared queue constants and types.
//
// BullMQ is gone. Grading moved to RabbitMQ + the Go worker (apps/judge), and
// the two side-effect queues it used to fan out to — update-problem-stats and
// update-rating — went with it: stats are now applied in the same transaction
// as the verdict, and update-rating never had a producer or a consumer.

// --- RabbitMQ topology: the TypeScript ⇄ Go boundary ---
//
// These strings are re-declared in apps/judge/internal/queue/consumer.go.
// Nothing enforces that they agree. If they drift, publishes still SUCCEED and
// the broker silently discards the message — no error on either side, just
// submissions that never get graded. Change one, change the other.
export const JUDGE_EXCHANGE = 'litecode';

export const JUDGE_ROUTING_KEYS = {
  /** Ordinary submissions. */
  default: 'judge.jobs.default',
  /** Premium tier, and later "run against samples" — drained ahead of default. */
  high: 'judge.jobs.high',
} as const;

export type JudgeLane = keyof typeof JUDGE_ROUTING_KEYS;

/**
 * Message body. A claim check — ids only, never test data: a broker holds
 * messages in memory, so multi-MB payloads are an OOM waiting to happen.
 * Field names must match `model.Job` in the Go worker.
 */
export interface JudgeJob {
  /** = Submission.id. Doubles as the idempotency key. */
  jobId: string;
  problemId: string;
}

// --- Redis connection helper ---
//
// Lives here for historical reasons — it was the BullMQ connection builder.
// Its only remaining consumer is the cache layer.
export const getRedisConnection = (url?: string) => {
  if (!url) return { host: 'localhost', port: 6379 };
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
  };
};
