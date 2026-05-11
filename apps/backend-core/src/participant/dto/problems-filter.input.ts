import { Field, InputType, Int } from '@nestjs/graphql';
import { Difficulty, SolvedStatus } from '@litecode/shared-types';
import './solved-status.enum';
import '../../admin/models/enums';

@InputType()
export class ProblemsFilterInput {
  @Field(() => Difficulty, { nullable: true })
  difficulty?: Difficulty;

  @Field(() => Int, { nullable: true, description: 'Inclusive lower bound on rating.' })
  minRating?: number;

  @Field(() => Int, { nullable: true, description: 'Inclusive upper bound on rating.' })
  maxRating?: number;

  @Field(() => String, { nullable: true, description: 'Filter by topic slug' })
  topicSlug?: string;

  @Field(() => String, { nullable: true, description: 'Case-insensitive title contains' })
  search?: string;

  @Field(() => SolvedStatus, {
    nullable: true,
    description: 'Filter by the authenticated user\'s solved/attempted state.',
  })
  solvedStatus?: SolvedStatus;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}
