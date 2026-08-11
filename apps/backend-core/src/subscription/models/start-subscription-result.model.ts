import { Field, ObjectType } from '@nestjs/graphql';


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
