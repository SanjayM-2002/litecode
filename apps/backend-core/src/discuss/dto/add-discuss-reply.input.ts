import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AddDiscussReplyInput {
  @Field(() => ID)
  postId: string;

  @Field(() => String)
  content: string;
}
