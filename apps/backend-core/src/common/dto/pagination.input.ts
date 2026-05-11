import { Field, InputType, Int } from '@nestjs/graphql';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1, description: '1-indexed page number.' })
  page?: number;

  @Field(() => Int, {
    nullable: true,
    defaultValue: DEFAULT_LIMIT,
    description: `Items per page. Capped at ${MAX_LIMIT}.`,
  })
  limit?: number;
}

export function clampPagination(p?: PaginationInput): { page: number; limit: number; skip: number } {
  const page = Math.max(1, p?.page ?? 1);
  const limit = Math.min(Math.max(1, p?.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}
