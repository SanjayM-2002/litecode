import { z } from 'zod';

/**
 * Per-user view of a problem's solve state. This is a query/filter concept,
 * not a persisted column — derived from the user's submission history.
 */
export const solvedStatusSchema = z.enum(['UNATTEMPTED', 'ATTEMPTED', 'SOLVED']);

export type SolvedStatus = z.infer<typeof solvedStatusSchema>;

export const SolvedStatus = {
  UNATTEMPTED: 'UNATTEMPTED',
  ATTEMPTED: 'ATTEMPTED',
  SOLVED: 'SOLVED',
} as const;

export const ALL_SOLVED_STATUSES: readonly SolvedStatus[] = solvedStatusSchema.options;
