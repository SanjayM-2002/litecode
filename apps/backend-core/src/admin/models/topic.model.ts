import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Topic')
export class TopicModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field()
  isActive: boolean;
}
