import { Field, InputType } from '@nestjs/graphql';
import { Language } from '@litecode/db';
import '../models/enums';

@InputType()
export class TemplateInput {
  @Field(() => Language)
  language: Language;

  @Field(() => String)
  starterCode: string;

  @Field(() => String)
  driverCode: string;
}
