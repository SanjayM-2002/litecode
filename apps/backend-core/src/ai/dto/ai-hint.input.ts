import { Field, ID, InputType } from '@nestjs/graphql';
import { Language } from '@litecode/shared-types';
import '../../admin/models/enums';

@InputType()
export class AiHintInput {
  @Field(() => ID)
  problemId: string;

  @Field(() => Language, { nullable: true })
  language?: Language;

  @Field(() => String, {
    nullable: true,
    description: 'Optional in-progress code so the hint can be tailored to where the user is stuck.',
  })
  code?: string;
}
