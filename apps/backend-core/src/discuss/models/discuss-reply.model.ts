import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PublicAuthorModel } from '../../common/models/public-author.model';

@ObjectType('DiscussReply')
export class DiscussReplyModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  postId: string;

  @Field(() => PublicAuthorModel)
  author: PublicAuthorModel;

  @Field(() => String)
  content: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
