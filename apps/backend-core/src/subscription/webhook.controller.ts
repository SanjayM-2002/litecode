import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RazorpayService } from './razorpay.service';
import { WebhookService } from './webhook.service';

@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly razorpay: RazorpayService,
    private readonly webhooks: WebhookService,
  ) {}

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventIdHeader: string | undefined,
  ): Promise<{ ok: true }> {
    if (!req.rawBody) {
      this.logger.error('Webhook received without rawBody — bootstrap rawBody=true required');
      throw new BadRequestException('Missing body');
    }

    if (!this.razorpay.verifyWebhookSignature(req.rawBody, signature)) {
      throw new BadRequestException('Invalid signature');
    }

    const payload = JSON.parse(req.rawBody.toString('utf8'));

    // Razorpay sometimes ships the event id in a header, sometimes in the body.
    // Fall back to a deterministic key built from event + subscription id +
    // created_at so retried deliveries still collide on the unique constraint.
    const subId = payload?.payload?.subscription?.entity?.id ?? 'no-sub';
    const eventId =
      eventIdHeader ??
      payload?.id ??
      `${payload?.event ?? 'unknown'}:${subId}:${payload?.created_at ?? Date.now()}`;

    await this.webhooks.handle(payload, eventId);
    return { ok: true };
  }
}
