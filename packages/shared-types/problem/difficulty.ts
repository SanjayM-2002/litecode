import { z } from 'zod';

export const difficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export type Difficulty = z.infer<typeof difficultySchema>;

export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;

export const ALL_DIFFICULTIES: readonly Difficulty[] = difficultySchema.options;

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};
