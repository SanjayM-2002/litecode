import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PlanInterval } from '@litecode/db';
import '../../admin/models/enums';

@ObjectType('Plan')
export class PlanModel {
  @Field(() => PlanInterval)
  interval: PlanInterval;

  @Field(() => Int, { description: 'Price in the smallest unit of the currency (paise for INR).' })
  amount: number;

  @Field(() => String)
  currency: string;

  @Field(() => String, { description: 'Human-readable price label.' })
  label: string;
}
