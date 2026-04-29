import { createZodDto } from 'nestjs-zod';
import { signupSchema } from '@litecode/shared-types';

export class SignupDto extends createZodDto(signupSchema) {}
