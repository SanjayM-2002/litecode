import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('DiscussProblemRef')
export class DiscussProblemRefModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  title: string;
}
