import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AiRoastInput {
  @Field(() => ID, {
    description: 'A submission belonging to the caller. Code, language, and problem are loaded server-side.',
  })
  submissionId: string;
}
