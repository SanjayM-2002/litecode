import { Field, ObjectType } from '@nestjs/graphql';
import { Language } from '@litecode/db';
import './enums';

@ObjectType('GeneratedTemplate')
export class GeneratedTemplateModel {
  @Field(() => Language)
  language: Language;

  @Field(() => String, { description: 'Editor-visible class skeleton for the user' })
  starterCode: string;

  @Field(() => String, {
    description: 'Hidden wrapper containing {{USER_CODE}} placeholder; merged at submit time',
  })
  driverCode: string;
}
