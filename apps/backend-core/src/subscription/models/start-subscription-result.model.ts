import { Field, ObjectType } from '@nestjs/graphql';

// Shape returned to the frontend after creating a subscription. The frontend
// hands these to Razorpay Checkout (`razorpay_key_id` + `subscription_id`) or
// redirects the user to `shortUrl` for the hosted Razorpay flow.
@ObjectType('StartSubscriptionResult')
export class StartSubscriptionResultModel {
  @Field(() => String)
  razorpaySubscriptionId: string;

  @Field(() => String, { description: 'Public Razorpay key id for Checkout.' })
  razorpayKeyId: string;

  @Field(() => String, {
    nullable: true,
    description: 'Hosted Razorpay authorization URL (optional, alternative to Checkout).',
  })
  shortUrl: string | null;
}
