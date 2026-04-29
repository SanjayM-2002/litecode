import { z } from 'zod';
import { genderSchema } from './gender';

export const updateProfileSchema = z
  .object({
    gender: genderSchema.nullable().optional(),
    birthday: z.coerce.date().nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    country: z.string().trim().min(1).max(100).nullable().optional(),
    state: z.string().trim().min(1).max(100).nullable().optional(),
    city: z.string().trim().min(1).max(100).nullable().optional(),
    skills: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  })
  .strict();

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
