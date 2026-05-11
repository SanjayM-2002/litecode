import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('PaginationMeta')
export class PaginationMeta {
  @Field(() => Int, { description: 'Total number of items matching the filter (across all pages).' })
  total: number;

  @Field(() => Int, { description: '1-indexed current page.' })
  page: number;

  @Field(() => Int, { description: 'Items per page.' })
  limit: number;

  @Field(() => Int, { description: 'ceil(total / limit). Always at least 1.' })
  totalPages: number;
}

export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { total, page, limit, totalPages };
}
