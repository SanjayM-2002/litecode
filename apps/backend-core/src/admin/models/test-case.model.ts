import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType('TestCase')
export class TestCaseModel {
  @Field(() => ID)
  id: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Positional JSON array matching Problem.signature.args. Null when only GCS path is set.',
  })
  inlineInput: unknown;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Expected return value as JSON. Null when only GCS path is set.',
  })
  inlineOutput: unknown;

  @Field(() => String, { nullable: true })
  inputPath: string | null;

  @Field(() => String, { nullable: true })
  outputPath: string | null;

  @Field()
  isSample: boolean;

  @Field(() => String, { nullable: true })
  explanation: string | null;

  @Field(() => Int)
  order: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
