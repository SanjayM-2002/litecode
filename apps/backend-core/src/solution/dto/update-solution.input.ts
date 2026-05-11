import { Field, InputType } from '@nestjs/graphql';
import { Language } from '@litecode/shared-types';
import '../../admin/models/enums';

@InputType()
export class UpdateSolutionInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => Language, { nullable: true })
  language?: Language;

  @Field(() => String, { nullable: true })
  code?: string;

  @Field(() => String, { nullable: true })
  content?: string;
}
