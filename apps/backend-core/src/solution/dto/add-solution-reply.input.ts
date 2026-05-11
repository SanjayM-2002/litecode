import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AddSolutionReplyInput {
  @Field(() => ID)
  solutionId: string;

  @Field(() => String)
  content: string;
}
