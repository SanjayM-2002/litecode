import { Field, InputType } from '@nestjs/graphql';
import { Gender } from '@litecode/db';
import '../models/enums';

@InputType()
export class UpdateProfileInput {
  @Field(() => Gender, { nullable: true })
  gender?: Gender | null;

  @Field(() => Date, { nullable: true })
  birthday?: Date | null;

  @Field(() => String, { nullable: true })
  bio?: string | null;

  @Field(() => String, { nullable: true })
  country?: string | null;

  @Field(() => String, { nullable: true })
  state?: string | null;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field(() => [String], { nullable: true })
  skills?: string[];
}
