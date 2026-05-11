import { Field, ID, InputType } from '@nestjs/graphql';
import { Language } from '@litecode/shared-types';
import '../../admin/models/enums';

@InputType()
export class SubmitSolutionInput {
  @Field(() => ID)
  problemId: string;

  @Field(() => Language)
  language: Language;

  @Field(() => String, {
    description: 'User-submitted source (just the class body, no driver).',
  })
  code: string;
}
