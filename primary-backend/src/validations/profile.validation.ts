import { z } from 'zod';
import { gender } from '../constants/constants';

const addProfileSchema = z.object({
  country: z
    .string()
    .max(50, { message: 'Country must be less than 50 characters' })
    .optional(),
  gender: z.enum(gender).optional(),
  location: z
    .string()
    .max(50, { message: 'Location must be less than 50 characters' })
    .optional(),
  birthday: z.string().datetime().optional(),
  bio: z
    .string()
    .max(150, { message: 'Bio must be less than 150 characters' })
    .optional(),
  skills: z
    .array(z.string())
    .max(10, { message: 'Skills must have a maximum of 10 items' })
    .optional(),
});

export { addProfileSchema };
