import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/models/paginated.factory';
import { DiscussPostModel } from './discuss-post.model';

@ObjectType('DiscussPostsPage')
export class DiscussPostsPage extends Paginated(DiscussPostModel) {}
