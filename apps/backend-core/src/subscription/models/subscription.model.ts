import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PlanInterval, SubscriptionStatus } from '@litecode/db';
import '../../admin/models/enums';

@ObjectType('Subscription')
export class SubscriptionModel {
  @Field(() => ID)
  id: string;

  @Field(() => PlanInterval)
  planInterval: PlanInterval;

  @Field(() => SubscriptionStatus)
  status: SubscriptionStatus;

  @Field(() => String, { description: 'Razorpay subscription id (sub_XXX).' })
  razorpaySubscriptionId: string;

  @Field(() => Date, { nullable: true })
  currentPeriodStart: Date | null;

  @Field(() => Date, {
    nullable: true,
    description: 'Tier remains PREMIUM until this date even after cancellation.',
  })
  currentPeriodEnd: Date | null;

  @Field(() => Date, { nullable: true })
  cancelledAt: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
