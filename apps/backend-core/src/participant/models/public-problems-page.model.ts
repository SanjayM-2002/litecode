import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/models/paginated.factory';
import { PublicProblemModel } from './public-problem.model';

@ObjectType('PublicProblemsPage')
export class PublicProblemsPage extends Paginated(PublicProblemModel) {}
