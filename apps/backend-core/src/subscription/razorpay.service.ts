import {
  BadGatewayException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
// razorpay uses CJS `module.exports = Razorpay` + `export = Razorpay`. The
// `import X = require(...)` syntax is the TS-idiomatic way to consume that
// without enabling esModuleInterop globally (which would change every other
// import in the project).
import Razorpay = require('razorpay');
import { Subscriptions } from 'razorpay/dist/types/subscriptions';

// Thin wrapper around the Razorpay SDK. All other code (services, webhook
// handlers) depends on this — never on `razorpay` directly — so the upstream
// SDK contract is contained.
@Injectable()
export class RazorpayService implements OnModuleInit {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private client!: Razorpay;

  constructor(config: ConfigService) {
    this.keyId = config.getOrThrow<string>('RAZORPAY_KEY_ID');
    this.keySecret = config.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = config.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET');
  }

  onModuleInit(): void {
    this.client = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
    this.logger.log('Razorpay client initialized');
  }

  getPublicKeyId(): string {
    return this.keyId;
  }

  async createSubscription(params: {
    planId: string;
    totalCount: number;
    userId: string;
  }): Promise<Subscriptions.RazorpaySubscription> {
    try {
      return await this.client.subscriptions.create({
        plan_id: params.planId,
        total_count: params.totalCount,
        customer_notify: 1,
        notes: { userId: params.userId },
      });
    } catch (err) {
      throw this.translateError('create subscription', err);
    }
  }

  async cancelSubscription(
    razorpaySubscriptionId: string,
    cancelAtCycleEnd: boolean,
  ): Promise<Subscriptions.RazorpaySubscription> {
    try {
      return await this.client.subscriptions.cancel(razorpaySubscriptionId, cancelAtCycleEnd);
    } catch (err) {
      throw this.translateError('cancel subscription', err);
    }
  }

  // Surfaces Razorpay's human-readable error (e.g. "The id provided does not
  // exist") to the GraphQL caller so misconfiguration is debuggable from the
  // client. These messages are safe to expose — they reference public ids and
  // Razorpay-controlled strings, not our secrets.
  private translateError(op: string, err: unknown): BadGatewayException {
    const description = this.extractDescription(err);
    const fallback = (err as Error)?.message ?? 'unknown error';
    const detail = description ?? fallback;
    this.logger.error(`Razorpay ${op} failed: ${detail}`);
    return new BadGatewayException(`Razorpay: ${detail}`);
  }

  private extractDescription(err: unknown): string | null {
    if (typeof err !== 'object' || err === null) return null;
    const e = err as { error?: { description?: string }; statusCode?: number };
    return e.error?.description ?? null;
  }

  // Webhook signature verification. Razorpay sends HMAC-SHA256 of the raw body
  // bytes (not the parsed JSON) signed with the webhook secret in the
  // `x-razorpay-signature` header. Uses timing-safe compare to avoid leaking
  // signature info via response time.
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
