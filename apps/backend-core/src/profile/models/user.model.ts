import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Role } from '@litecode/db';
import { ParticipantProfileModel } from './participant-profile.model';
import './enums';

@ObjectType('User')
export class UserModel {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => Role)
  role: Role;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => ParticipantProfileModel, { nullable: true })
  participantProfile: ParticipantProfileModel | null;
}
