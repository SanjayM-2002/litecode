import { Field, ObjectType } from '@nestjs/graphql';
import { ArgumentModel } from './argument.model';

@ObjectType('Signature')
export class SignatureModel {
  @Field(() => String)
  methodName: string;

  @Field(() => [ArgumentModel])
  args: ArgumentModel[];

  @Field(() => String)
  returnType: string;
}
