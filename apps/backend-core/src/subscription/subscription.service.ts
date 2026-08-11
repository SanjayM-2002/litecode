import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanInterval, PrismaService, SubscriptionStatus } from '@litecode/db';
import { PLANS } from './plans.config';
import { RazorpayService } from './razorpay.service';
import { PlanModel } from './models/plan.model';
import { SubscriptionModel } from './models/subscription.model';
import { StartSubscriptionResultModel } from './models/start-subscription-result.model';
import { StartSubscriptionInput } from './dto/start-subscription.input';


const ACTIVE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.CREATED,
  SubscriptionStatus.AUTHENTICATED,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PENDING,
  SubscriptionStatus.HALTED,
];

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

  listPlans(): PlanModel[] {
    return (Object.keys(PLANS) as PlanInterval[]).map((interval) => {
      const cfg = PLANS[interval];
      return {
        interval,
        amount: cfg.amount,
        currency: cfg.currency,
        label: cfg.label,
      };
    });
  }

  async start(
    userId: string,
    input: StartSubscriptionInput,
  ): Promise<StartSubscriptionResultModel> {
    const plan = PLANS[input.interval];
    if (!plan) throw new BadRequestException('Unknown plan interval');

    const existing = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ACTIVE_STATUSES } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('ALREADY_SUBSCRIBED');
    }

    const razorpaySub = await this.razorpay.createSubscription({
      planId: plan.razorpayPlanId,
      totalCount: plan.totalCount,
      userId,
    });

    await this.prisma.subscription.create({
      data: {
        userId,
        planInterval: input.interval,
        razorpaySubscriptionId: razorpaySub.id,
        status: SubscriptionStatus.CREATED,
      },
    });

    return {
      razorpaySubscriptionId: razorpaySub.id,
      razorpayKeyId: this.razorpay.getPublicKeyId(),
      shortUrl: razorpaySub.short_url ?? null,
    };
  }

  async getMine(userId: string): Promise<SubscriptionModel | null> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return sub as SubscriptionModel | null;
  }

  async cancel(userId: string): Promise<SubscriptionModel> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) throw new NotFoundException('No active subscription');
    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new ForbiddenException('Subscription already cancelled');
    }

    await this.razorpay.cancelSubscription(sub.razorpaySubscriptionId, true);
    
    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });

    return updated as SubscriptionModel;
  }
}
