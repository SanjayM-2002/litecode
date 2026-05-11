import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PublicAuthorModel } from '../../common/models/public-author.model';

@ObjectType('SolutionReply')
export class SolutionReplyModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  solutionId: string;

  @Field(() => PublicAuthorModel)
  author: PublicAuthorModel;

  @Field(() => String)
  content: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
