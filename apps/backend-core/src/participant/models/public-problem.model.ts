import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { Difficulty } from '@litecode/shared-types';
import { SignatureModel } from '../../admin/models/signature.model';
import { TopicModel } from '../../admin/models/topic.model';
import { PublicCodeTemplateModel } from './public-code-template.model';
import { PublicTestCaseModel } from './public-test-case.model';
import '../../admin/models/enums';

/**
 * Participant-facing Problem type. Subset of the admin Problem.
 * - excludes driverCode (lives only on PublicCodeTemplate-less templates here too)
 * - excludes hidden test cases (only sample cases included)
 * - excludes isPublished (always true for results returned to participants)
 * - excludes createdById / authoring metadata
 */
@ObjectType('PublicProblem')
export class PublicProblemModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  description: string;

  @Field(() => Difficulty)
  difficulty: Difficulty;

  @Field(() => Int)
  rating: number;

  @Field(() => Int)
  timeLimit_ms: number;

  @Field(() => Int)
  memoryLimit_kb: number;

  @Field(() => SignatureModel)
  signature: SignatureModel;

  @Field(() => [TopicModel])
  topics: TopicModel[];

  @Field(() => [PublicCodeTemplateModel])
  templates: PublicCodeTemplateModel[];

  @Field(() => [PublicTestCaseModel], {
    description: 'Sample test cases (isSample=true). Hidden cases are not exposed.',
  })
  sampleTestCases: PublicTestCaseModel[];

  @Field(() => Boolean, {
    description:
      'True if the authenticated user has at least one ACCEPTED submission for this problem. Always false for unauthenticated callers.',
  })
  solved: boolean;

  @Field(() => Boolean, {
    description:
      'True if the authenticated user has at least one submission for this problem (any verdict).',
  })
  attempted: boolean;

  @Field(() => Int, {
    description:
      'Total number of submissions across all users for this problem. 0 if no one has submitted yet.',
  })
  totalSubmissions: number;

  @Field(() => Float, {
    description:
      'Fraction of submissions that were ACCEPTED (0..1). 0 if there are no submissions yet.',
  })
  acceptanceRate: number;

  @Field(() => Date)
  createdAt: Date;
}
