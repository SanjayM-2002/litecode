import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Language } from '@litecode/shared-types';
import '../../admin/models/enums';
import { PublicAuthorModel } from '../../common/models/public-author.model';
import { SolutionReplyModel } from './solution-reply.model';

@ObjectType('Solution')
export class SolutionModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  problemId: string;

  @Field(() => PublicAuthorModel)
  author: PublicAuthorModel;

  @Field(() => String)
  title: string;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  code: string;

  @Field(() => String, { description: 'Markdown explanation. Images/videos not supported.' })
  content: string;

  @Field(() => [SolutionReplyModel], {
    description: 'Replies, oldest-first. May be empty.',
  })
  replies: SolutionReplyModel[];

  @Field(() => Int, { description: 'Total reply count (== replies.length).' })
  replyCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
