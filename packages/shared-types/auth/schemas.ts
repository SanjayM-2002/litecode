import { z } from 'zod';

const email = z.string().trim().toLowerCase().email();

const password = z.string().min(8).max(128);

export const signupSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type SignupSchema = z.infer<typeof signupSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
