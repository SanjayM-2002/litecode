// Shared Queue Constants and Types

export const SUBMISSION_QUEUE = 'submission-queue';

export interface SubmissionJobPayload {
  submissionId: string;
  problemId: string;
  userId: string;
  language: string;
  code: string;
}

export const getRedisConnection = (url?: string) => {
  return {
    host: url ? new URL(url).hostname : 'localhost',
    port: url ? Number(new URL(url).port) : 6379,
    password: url ? new URL(url).password : undefined,
  };
};
