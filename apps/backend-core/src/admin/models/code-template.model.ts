import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Language } from '@litecode/db';
import './enums';

@ObjectType('CodeTemplate')
export class CodeTemplateModel {
  @Field(() => ID)
  id: string;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  starterCode: string;

  @Field(() => String, { description: 'Hidden wrapper with {{USER_CODE}} placeholder' })
  driverCode: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
