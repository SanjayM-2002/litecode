import { Field, ID, InputType } from '@nestjs/graphql';
import { Language } from '@litecode/shared-types';
import '../../admin/models/enums';

@InputType()
export class CreateSolutionInput {
  @Field(() => ID)
  problemId: string;

  @Field(() => String, { description: 'Short headline shown in the solutions list.' })
  title: string;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  code: string;

  @Field(() => String, {
    description: 'Markdown body explaining the approach. Images/videos not supported.',
  })
  content: string;
}
