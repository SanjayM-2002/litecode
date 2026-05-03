import { Field, InputType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class TestCaseInput {
  @Field(() => GraphQLJSON, {
    description: 'Positional JSON array matching Problem.signature.args, e.g., [[2,7,11,15], 9]',
  })
  inlineInput: unknown;

  @Field(() => GraphQLJSON, { description: 'Expected return value as JSON, e.g., [0, 1]' })
  inlineOutput: unknown;

  @Field(() => Boolean, { defaultValue: false })
  isSample: boolean;

  @Field(() => String, { nullable: true })
  explanation?: string;
}

@InputType()
export class UpdateTestCaseInput {
  @Field(() => GraphQLJSON, { nullable: true })
  inlineInput?: unknown;

  @Field(() => GraphQLJSON, { nullable: true })
  inlineOutput?: unknown;

  @Field(() => Boolean, { nullable: true })
  isSample?: boolean;

  @Field(() => String, { nullable: true })
  explanation?: string;

  @Field(() => Int, { nullable: true, description: 'Manual reordering of a single case.' })
  order?: number;
}
