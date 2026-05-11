import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class PublicTopicsFilterInput {
  @Field(() => String, {
    nullable: true,
    description: 'Case-insensitive contains match against name or slug.',
  })
  search?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  limit?: number;
}
