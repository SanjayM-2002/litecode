import { Field, InputType } from '@nestjs/graphql';
import { ArgumentInput } from './argument.input';

@InputType()
export class SignatureInput {
  @Field(() => String, { description: 'Method name on Solution class, e.g., "twoSum"' })
  methodName: string;

  @Field(() => [ArgumentInput], { description: 'Positional arguments' })
  args: ArgumentInput[];

  @Field(() => String, { description: 'Return type, e.g., "int[]" or "void"' })
  returnType: string;
}
