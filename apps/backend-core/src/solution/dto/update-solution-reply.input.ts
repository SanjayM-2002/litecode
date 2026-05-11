import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateSolutionReplyInput {
  @Field(() => String)
  content: string;
}
