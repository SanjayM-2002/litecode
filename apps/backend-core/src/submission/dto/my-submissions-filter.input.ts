import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Language, SubmissionStatus, Verdict } from '@litecode/shared-types';
import '../models/enums';
import '../../admin/models/enums';

@InputType()
export class MySubmissionsFilterInput {
  @Field(() => ID, { nullable: true, description: 'Filter to a specific problem.' })
  problemId?: string;

  @Field(() => Language, { nullable: true })
  language?: Language;

  @Field(() => SubmissionStatus, { nullable: true })
  status?: SubmissionStatus;

  @Field(() => Verdict, { nullable: true })
  verdict?: Verdict;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}
