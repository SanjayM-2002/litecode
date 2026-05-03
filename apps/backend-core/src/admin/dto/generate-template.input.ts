import { Field, InputType } from '@nestjs/graphql';
import { Language } from '@litecode/db';
import { SignatureInput } from './signature.input';
import '../models/enums';

@InputType()
export class GenerateTemplateInput {
  @Field(() => SignatureInput)
  signature: SignatureInput;

  @Field(() => Language)
  language: Language;
}
