import { z } from 'zod';

export const roleSchema = z.enum(['PARTICIPANT', 'ADMIN']);

export type Role = z.infer<typeof roleSchema>;

/**
 * Runtime enum object — usable as both a TS type (via the matching `Role` type
 * export above) and a value (e.g. for `registerEnumType` in NestJS GraphQL).
 */
export const Role = {
  PARTICIPANT: 'PARTICIPANT',
  ADMIN: 'ADMIN',
} as const;
