import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionResolver } from './subscription.resolver';
import { WebhookService } from './webhook.service';
import { RazorpayWebhookController } from './webhook.controller';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [RazorpayWebhookController],
  providers: [
    RazorpayService,
    SubscriptionService,
    SubscriptionResolver,
    WebhookService,
  ],
})
export class SubscriptionModule {}
