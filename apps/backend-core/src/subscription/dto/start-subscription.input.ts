import { Field, InputType } from '@nestjs/graphql';
import { PlanInterval } from '@litecode/db';
import '../../admin/models/enums';

@InputType()
export class StartSubscriptionInput {
  @Field(() => PlanInterval)
  interval: PlanInterval;
}
