import { registerEnumType } from '@nestjs/graphql';
import { Difficulty, Language, UserTier } from '@litecode/shared-types';
import { Permission, PlanInterval, SubscriptionStatus } from '@litecode/db';

registerEnumType(Permission, { name: 'Permission' });
registerEnumType(Language, { name: 'Language' });
registerEnumType(Difficulty, { name: 'Difficulty' });
registerEnumType(UserTier, { name: 'UserTier' });
registerEnumType(PlanInterval, { name: 'PlanInterval' });
registerEnumType(SubscriptionStatus, { name: 'SubscriptionStatus' });
