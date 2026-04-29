import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Gender } from '@litecode/db';
import './enums';

@ObjectType('ParticipantProfile')
export class ParticipantProfileModel {
  @Field(() => ID)
  id: string;

  @Field(() => Gender, { nullable: true })
  gender: Gender | null;

  @Field(() => Date, { nullable: true })
  birthday: Date | null;

  @Field(() => String, { nullable: true })
  bio: string | null;

  @Field(() => String, { nullable: true })
  country: string | null;

  @Field(() => String, { nullable: true })
  state: string | null;

  @Field(() => String, { nullable: true })
  city: string | null;

  @Field(() => [String])
  skills: string[];

  @Field(() => Int)
  coins: number;

  @Field(() => Int)
  rating: number;

  @Field()
  isPremium: boolean;

  @Field(() => Date, { nullable: true })
  premiumUntil: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
