import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ArgumentInput {
  @Field(() => String)
  name: string;

  @Field(() => String, {
    description: 'e.g., "int", "int[]", "string", "boolean", "void"',
  })
  type: string;
}
