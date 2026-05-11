import { z } from 'zod';

export const userTierSchema = z.enum(['FREE', 'PREMIUM']);

export type UserTier = z.infer<typeof userTierSchema>;

export const UserTier = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
} as const;
