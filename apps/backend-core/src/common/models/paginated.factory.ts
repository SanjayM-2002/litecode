import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';
import { PaginationMeta } from './pagination-meta.model';

export interface PaginatedType<T> {
  items: T[];
  meta: PaginationMeta;
}

export function Paginated<T>(classRef: Type<T>): Type<PaginatedType<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedClass implements PaginatedType<T> {
    @Field(() => [classRef])
    items: T[];

    @Field(() => PaginationMeta)
    meta: PaginationMeta;
  }
  return PaginatedClass as Type<PaginatedType<T>>;
}
