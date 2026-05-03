import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Difficulty } from '@litecode/db';
import { CodeTemplateModel } from './code-template.model';
import { SignatureModel } from './signature.model';
import { TestCaseModel } from './test-case.model';
import { TopicModel } from './topic.model';
import './enums';

@ObjectType('Problem')
export class ProblemModel {
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

  @Field(() => Int, { description: 'Numeric difficulty rating (typical range 800–3500).' })
  rating: number;

  @Field()
  isPublished: boolean;

  @Field(() => SignatureModel)
  signature: SignatureModel;

  @Field(() => [TopicModel])
  topics: TopicModel[];

  @Field(() => [CodeTemplateModel])
  templates: CodeTemplateModel[];

  @Field(() => [TestCaseModel])
  testCases: TestCaseModel[];

  @Field(() => ID)
  createdById: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
