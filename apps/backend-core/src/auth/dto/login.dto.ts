import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@litecode/shared-types';

export class LoginDto extends createZodDto(loginSchema) {}
