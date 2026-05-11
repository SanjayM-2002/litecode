import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/models/paginated.factory';
import { ProblemModel } from './problem.model';

@ObjectType('AdminProblemsPage')
export class AdminProblemsPage extends Paginated(ProblemModel) {}
