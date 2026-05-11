import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { DiscussTag } from '@litecode/shared-types';
import '../dto/discuss-tag.enum';
import { PublicAuthorModel } from '../../common/models/public-author.model';
import { DiscussReplyModel } from './discuss-reply.model';
import { DiscussProblemRefModel } from './discuss-problem-ref.model';

@ObjectType('DiscussPost')
export class DiscussPostModel {
  @Field(() => ID)
  id: string;

  @Field(() => PublicAuthorModel)
  author: PublicAuthorModel;

  @Field(() => String)
  title: string;

  @Field(() => String, { description: 'Markdown body. Images/videos not supported.' })
  content: string;

  @Field(() => DiscussTag)
  tag: DiscussTag;

  @Field(() => DiscussProblemRefModel, {
    nullable: true,
    description: 'Optional cross-link to a problem the post is about.',
  })
  problem: DiscussProblemRefModel | null;

  @Field(() => [DiscussReplyModel], { description: 'Replies, oldest-first.' })
  replies: DiscussReplyModel[];

  @Field(() => Int)
  replyCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
