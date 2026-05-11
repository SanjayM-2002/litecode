import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/models/paginated.factory';
import { TopicModel } from './topic.model';

@ObjectType('TopicsPage')
export class TopicsPage extends Paginated(TopicModel) {}
