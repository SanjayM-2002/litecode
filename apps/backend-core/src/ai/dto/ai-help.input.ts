import { Field, ID, InputType } from '@nestjs/graphql';
import { Language } from '@litecode/shared-types';
import '../../admin/models/enums';

@InputType()
export class AiHelpInput {
  @Field(() => ID)
  problemId: string;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  code: string;

  @Field(() => String, {
    description: 'The user\'s question about the problem or their current approach.',
  })
  question: string;
}
