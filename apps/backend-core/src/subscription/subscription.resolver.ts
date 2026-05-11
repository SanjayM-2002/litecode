import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtPayload } from '../auth/auth.service';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { StartSubscriptionInput } from './dto/start-subscription.input';
import { PlanModel } from './models/plan.model';
import { StartSubscriptionResultModel } from './models/start-subscription-result.model';
import { SubscriptionModel } from './models/subscription.model';
import { SubscriptionService } from './subscription.service';

@Resolver()
export class SubscriptionResolver {
  constructor(private readonly service: SubscriptionService) {}

  @Query(() => [PlanModel], {
    description: 'List available subscription plans. Public — no auth required.',
  })
  plans(): PlanModel[] {
    return this.service.listPlans();
  }

  @Query(() => SubscriptionModel, {
    nullable: true,
    description: 'Caller\'s most recent subscription (any status), or null if none.',
  })
  @UseGuards(GqlJwtAuthGuard)
  async mySubscription(
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<SubscriptionModel | null> {
    return this.service.getMine(user.sub);
  }

  @Mutation(() => StartSubscriptionResultModel, {
    description:
      'Create a Razorpay subscription for the chosen plan. Returns IDs the frontend hands to Razorpay Checkout.',
  })
  @UseGuards(GqlJwtAuthGuard)
  async startSubscription(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input') input: StartSubscriptionInput,
  ): Promise<StartSubscriptionResultModel> {
    return this.service.start(user.sub, input);
  }

  @Mutation(() => SubscriptionModel, {
    description:
      'Cancel the caller\'s active subscription. They keep PREMIUM until currentPeriodEnd.',
  })
  @UseGuards(GqlJwtAuthGuard)
  async cancelSubscription(
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<SubscriptionModel> {
    return this.service.cancel(user.sub);
  }
}
