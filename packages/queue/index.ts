// Shared Queue Constants and Types

// --- Queues ---

export const QUEUES = {
  /** Critical-path: assemble source, run test cases via Judge0, write verdict. */
  gradeSubmission: 'grade-submission',
  /** Side effect: update user rating after a submission is graded. */
  updateRating: 'update-rating',
  /** Side effect: increment Problem aggregate counters. */
  updateProblemStats: 'update-problem-stats',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// Legacy alias kept until consumers migrate.
export const SUBMISSION_QUEUE = QUEUES.gradeSubmission;

// --- Job payloads ---

/** Sent when a user submits code; consumed by the Grader worker. */
export interface GradeSubmissionJob {
  submissionId: string;
}

/** Emitted by the Grader worker after the verdict lands; consumed by the Rating worker. */
export interface UpdateRatingJob {
  submissionId: string;
  userId: string;
  problemId: string;
  verdict: string; // Verdict enum value as string, to keep this package Prisma-free
}

/** Emitted by the Grader worker after the verdict lands; consumed by the Stats worker. */
export interface UpdateProblemStatsJob {
  submissionId: string;
  problemId: string;
  verdict: string;
}

// Legacy alias.
export type SubmissionJobPayload = GradeSubmissionJob & {
  problemId: string;
  userId: string;
  language: string;
  code: string;
};

// --- Redis connection helper ---

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
