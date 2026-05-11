import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateDiscussReplyInput {
  @Field(() => String)
  content: string;
}
