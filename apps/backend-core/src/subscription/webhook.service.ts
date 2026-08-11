import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  PrismaService,
  SubscriptionStatus,
  UserTier,
} from '@litecode/db';
import { EntitlementService } from '../entitlement/entitlement.service';

// Razorpay webhook payload shape
interface RazorpayWebhookEvent {
  event: string;
  id?: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        status: string;
        current_start?: number | null;
        current_end?: number | null;
        ended_at?: number | null;
        notes?: Record<string, string | number>;
      };
    };
  };
  created_at?: number;
}

type TxClient = Prisma.TransactionClient;

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  created: SubscriptionStatus.CREATED,
  authenticated: SubscriptionStatus.AUTHENTICATED,
  active: SubscriptionStatus.ACTIVE,
  pending: SubscriptionStatus.PENDING,
  halted: SubscriptionStatus.HALTED,
  cancelled: SubscriptionStatus.CANCELLED,
  completed: SubscriptionStatus.COMPLETED,
  expired: SubscriptionStatus.EXPIRED,
};


const PREMIUM_ENTITLING_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.AUTHENTICATED,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PENDING,
  SubscriptionStatus.HALTED,
]);

interface HandleResult {
  duplicate: boolean;
  tierChangedForUserId: string | null;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlement: EntitlementService,
  ) {}

  async handle(event: RazorpayWebhookEvent, eventId: string): Promise<boolean> {
    let result: HandleResult;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        try {
          await tx.webhookEvent.create({
            data: {
              razorpayEventId: eventId,
              eventType: event.event,
              payload: event as unknown as Prisma.InputJsonValue,
            },
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            this.logger.log(`Duplicate webhook ${eventId} (${event.event}) — ignored`);
            return { duplicate: true, tierChangedForUserId: null };
          }
          throw err;
        }

        const tierChangedForUserId = await this.dispatch(tx, event);

        await tx.webhookEvent.update({
          where: { razorpayEventId: eventId },
          data: { processedAt: new Date() },
        });

        return { duplicate: false, tierChangedForUserId };
      });
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      this.logger.error(`Webhook ${eventId} (${event.event}) failed: ${msg}`);
      throw err; // surface to controller → 5xx → Razorpay retries
    }

    if (result.duplicate) return false;
    if (result.tierChangedForUserId) {
      await this.entitlement.invalidate(result.tierChangedForUserId);
    }
    return true;
  }


  private async dispatch(
    tx: TxClient,
    event: RazorpayWebhookEvent,
  ): Promise<string | null> {
    const sub = event.payload?.subscription?.entity;
    if (!sub) {
      this.logger.warn(`Webhook ${event.event} missing subscription payload`);
      return null;
    }

    const newStatus = STATUS_MAP[sub.status];
    if (!newStatus) {
      this.logger.warn(`Unknown subscription status from Razorpay: ${sub.status}`);
      return null;
    }

    const local = await tx.subscription.findUnique({
      where: { razorpaySubscriptionId: sub.id },
      select: { id: true, userId: true },
    });
    if (!local) {
      this.logger.warn(
        `Webhook references unknown razorpaySubscriptionId=${sub.id}; skipping`,
      );
      return null;
    }

    await tx.subscription.update({
      where: { id: local.id },
      data: {
        status: newStatus,
        currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : null,
        currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : null,
        cancelledAt:
          newStatus === SubscriptionStatus.CANCELLED && sub.ended_at
            ? new Date(sub.ended_at * 1000)
            : undefined,
      },
    });

    const targetTier =
      newStatus === SubscriptionStatus.CANCELLED ||
      newStatus === SubscriptionStatus.COMPLETED ||
      newStatus === SubscriptionStatus.EXPIRED
        ? UserTier.FREE
        : PREMIUM_ENTITLING_STATUSES.has(newStatus)
          ? UserTier.PREMIUM
          : null;

    if (!targetTier) return null;

    await tx.user.update({
      where: { id: local.userId },
      data: { tier: targetTier },
    });

    return local.userId;
  }
}
