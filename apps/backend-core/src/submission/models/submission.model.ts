import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { Language, SubmissionStatus, Verdict } from '@litecode/shared-types';
import './enums';
import '../../admin/models/enums';

@ObjectType('Submission')
export class SubmissionModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  problemId: string;

  @Field(() => Language)
  language: Language;

  @Field(() => String, { description: 'User-submitted source (just the class body).' })
  code: string;

  @Field(() => SubmissionStatus)
  status: SubmissionStatus;

  @Field(() => Verdict, { nullable: true })
  verdict: Verdict | null;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Per-test-case detail. Shape: [{ testCaseId, verdict, runtime_ms, memory_kb, stdout, stderr, isSample }]',
  })
  testResults: unknown;

  @Field(() => Int, { nullable: true })
  runtime_ms: number | null;

  @Field(() => Int, { nullable: true })
  memory_kb: number | null;

  @Field(() => ID, { nullable: true })
  failedTestCaseId: string | null;

  @Field(() => String, { nullable: true })
  errorMessage: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  startedAt: Date | null;

  @Field(() => Date, { nullable: true })
  completedAt: Date | null;
}
