import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * Public-safe slice of a User used as a "byline" on community content
 * (solutions, discuss posts, replies). Excludes email and any sensitive fields.
 */
@ObjectType('PublicAuthor')
export class PublicAuthorModel {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  name: string | null;
}
