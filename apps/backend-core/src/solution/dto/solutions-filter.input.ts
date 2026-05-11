import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Language } from '@litecode/shared-types';
import '../../admin/models/enums';

@InputType()
export class SolutionsFilterInput {
  @Field(() => ID, { description: 'Restrict to solutions for this problem.' })
  problemId: string;

  @Field(() => Language, { nullable: true, description: 'Optional language filter.' })
  language?: Language;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}
