import { Field, ObjectType } from '@nestjs/graphql';
import { UserModel } from '../../profile/models/user.model';
import { AdminProfileModel } from './admin-profile.model';

@ObjectType('AdminMe')
export class AdminMeModel {
  @Field(() => UserModel)
  user: UserModel;

  @Field(() => AdminProfileModel)
  profile: AdminProfileModel;
}
