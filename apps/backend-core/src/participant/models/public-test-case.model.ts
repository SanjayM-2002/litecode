import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';


@ObjectType('PublicTestCase')
export class PublicTestCaseModel {
  @Field(() => ID)
  id: string;

  @Field(() => GraphQLJSON, {
    description: 'Positional JSON array matching Problem.signature.args.',
  })
  inlineInput: unknown;

  @Field(() => GraphQLJSON, { description: 'Expected return value as JSON.' })
  inlineOutput: unknown;

  @Field(() => String, { nullable: true })
  explanation: string | null;

  @Field(() => Int)
  order: number;
}
