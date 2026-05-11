import { Field, ID, InputType } from '@nestjs/graphql';
import { DiscussTag } from '@litecode/shared-types';
import './discuss-tag.enum';

@InputType()
export class CreateDiscussPostInput {
  @Field(() => String)
  title: string;

  @Field(() => String, {
    description: 'Markdown body. Images/videos not supported.',
  })
  content: string;

  @Field(() => DiscussTag)
  tag: DiscussTag;

  @Field(() => ID, {
    nullable: true,
    description: 'Optional. If set, attaches the post to a published problem.',
  })
  problemId?: string;
}
