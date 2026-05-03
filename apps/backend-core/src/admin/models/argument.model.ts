import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Argument')
export class ArgumentModel {
  @Field(() => String)
  name: string;

  @Field(() => String)
  type: string;
}
