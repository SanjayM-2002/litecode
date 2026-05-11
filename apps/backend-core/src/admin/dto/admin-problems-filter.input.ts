import { Field, InputType, Int } from '@nestjs/graphql';
import { Difficulty } from '@litecode/shared-types';
import '../models/enums';

@InputType()
export class AdminProblemsFilterInput {
  @Field(() => Difficulty, { nullable: true })
  difficulty?: Difficulty;

  @Field(() => Int, { nullable: true, description: 'Inclusive lower bound on rating.' })
  minRating?: number;

  @Field(() => Int, { nullable: true, description: 'Inclusive upper bound on rating.' })
  maxRating?: number;

  @Field(() => Boolean, { nullable: true })
  isPublished?: boolean;

  @Field(() => String, { nullable: true, description: 'Case-insensitive title contains' })
  search?: string;

  @Field(() => String, { nullable: true, description: 'Filter by topic slug' })
  topicSlug?: string;

  @Field(() => String, { nullable: true, description: 'Filter to a specific author by user ID' })
  createdById?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}
