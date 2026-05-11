import { z } from 'zod';

/**
 * Lifecycle state of a submission, set by the grader pipeline.
 * - PENDING : queued, awaiting worker
 * - RUNNING : worker picked up, executing test cases
 * - GRADED  : final verdict written
 */
export const submissionStatusSchema = z.enum(['PENDING', 'RUNNING', 'GRADED']);

export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

export const SubmissionStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  GRADED: 'GRADED',
} as const;

export const ALL_SUBMISSION_STATUSES: readonly SubmissionStatus[] =
  submissionStatusSchema.options;

export const SUBMISSION_STATUS_LABELS: Readonly<Record<SubmissionStatus, string>> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  GRADED: 'Graded',
};
