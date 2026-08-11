export const JUDGE_EXCHANGE = 'litecode';

export const JUDGE_ROUTING_KEYS = {
  default: 'judge.jobs.default', // normal submission
  high: 'judge.jobs.high', // premium user submission
} as const;

export type JudgeLane = keyof typeof JUDGE_ROUTING_KEYS;

export interface JudgeJob {
  /** = Submission.id. Doubles as the idempotency key. */
  jobId: string;
  problemId: string;
}

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
