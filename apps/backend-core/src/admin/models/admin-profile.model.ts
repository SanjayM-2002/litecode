import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Permission } from '@litecode/db';
import './enums';

@ObjectType('AdminProfile')
export class AdminProfileModel {
  @Field(() => ID)
  id: string;

  @Field(() => [Permission])
  permissions: Permission[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
