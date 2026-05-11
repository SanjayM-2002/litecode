import { z } from 'zod';

export const verdictSchema = z.enum([
  'ACCEPTED',
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'COMPILATION_ERROR',
  'INTERNAL_ERROR',
]);

export type Verdict = z.infer<typeof verdictSchema>;

export const Verdict = {
  ACCEPTED: 'ACCEPTED',
  WRONG_ANSWER: 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED: 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  COMPILATION_ERROR: 'COMPILATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const ALL_VERDICTS: readonly Verdict[] = verdictSchema.options;

/** Full verdict labels — suitable for verbose status displays. */
export const VERDICT_LABELS: Readonly<Record<Verdict, string>> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILATION_ERROR: 'Compilation Error',
  INTERNAL_ERROR: 'Internal Error',
};

/** Compact verdict labels — suitable for table rows / badges with limited width. */
export const VERDICT_LABELS_SHORT: Readonly<Record<Verdict, string>> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'TLE',
  MEMORY_LIMIT_EXCEEDED: 'MLE',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILATION_ERROR: 'Compilation Error',
  INTERNAL_ERROR: 'Internal Error',
};
