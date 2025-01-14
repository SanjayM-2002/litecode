import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(20, { message: 'Password must be less than 20 characters' }),
  fullname: z.string().min(1, { message: 'Full name is required' }),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Invalid password' }),
});

export { signupSchema, loginSchema };
