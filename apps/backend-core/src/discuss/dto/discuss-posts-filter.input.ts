import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { DiscussTag } from '@litecode/shared-types';
import './discuss-tag.enum';

@InputType()
export class DiscussPostsFilterInput {
  @Field(() => DiscussTag, { nullable: true, description: 'Filter to a single tag.' })
  tag?: DiscussTag;

  @Field(() => ID, {
    nullable: true,
    description: 'Restrict to posts linked to a specific problem.',
  })
  problemId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Case-insensitive contains match against title or content.',
  })
  search?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}
