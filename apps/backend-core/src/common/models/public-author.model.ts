import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('PublicAuthor')
export class PublicAuthorModel {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  name: string | null;
}
