import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/models/paginated.factory';
import { SubmissionModel } from './submission.model';

@ObjectType('SubmissionsPage')
export class SubmissionsPage extends Paginated(SubmissionModel) {}
