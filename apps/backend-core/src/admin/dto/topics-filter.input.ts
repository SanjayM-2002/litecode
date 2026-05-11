import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class TopicsFilterInput {
  @Field(() => String, {
    nullable: true,
    description: 'Case-insensitive contains match against name or slug.',
  })
  search?: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description: 'Filter by isActive flag. Pass null to include inactive too.',
  })
  isActive?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}
