import { z } from 'zod';

export const discussTagSchema = z.enum([
  'GENERAL',
  'PROBLEM',
  'CAREER',
  'INTERVIEW',
  'COMPENSATION',
]);

export type DiscussTag = z.infer<typeof discussTagSchema>;

export const DiscussTag = {
  GENERAL: 'GENERAL',
  PROBLEM: 'PROBLEM',
  CAREER: 'CAREER',
  INTERVIEW: 'INTERVIEW',
  COMPENSATION: 'COMPENSATION',
} as const;

export const ALL_DISCUSS_TAGS: readonly DiscussTag[] = discussTagSchema.options;

export const DISCUSS_TAG_LABELS: Readonly<Record<DiscussTag, string>> = {
  GENERAL: 'General',
  PROBLEM: 'Problem',
  CAREER: 'Career',
  INTERVIEW: 'Interview',
  COMPENSATION: 'Compensation',
};
