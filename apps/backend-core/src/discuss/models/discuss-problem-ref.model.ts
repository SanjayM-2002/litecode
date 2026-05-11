import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * Minimal Problem reference embedded inside a DiscussPost when the post is
 * cross-linked to a problem. Keeps the discuss query self-contained so the
 * client can render "Related to {title}" without a second round-trip.
 */
@ObjectType('DiscussProblemRef')
export class DiscussProblemRefModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  title: string;
}
