import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/models/paginated.factory';
import { SolutionModel } from './solution.model';

@ObjectType('SolutionsPage')
export class SolutionsPage extends Paginated(SolutionModel) {}
