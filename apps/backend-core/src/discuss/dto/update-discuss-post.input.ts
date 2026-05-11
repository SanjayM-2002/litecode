import { Field, ID, InputType } from '@nestjs/graphql';
import { DiscussTag } from '@litecode/shared-types';
import './discuss-tag.enum';

@InputType()
export class UpdateDiscussPostInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  content?: string;

  @Field(() => DiscussTag, { nullable: true })
  tag?: DiscussTag;

  @Field(() => ID, {
    nullable: true,
    description: 'Pass an ID to attach, or pass null to detach the problem link.',
  })
  problemId?: string | null;
}
