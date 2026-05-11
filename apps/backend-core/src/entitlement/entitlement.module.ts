import { Global, Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { PremiumGuard } from './guards/premium.guard';
import { GqlPremiumGuard } from './guards/gql-premium.guard';

@Global()
@Module({
  providers: [EntitlementService, PremiumGuard, GqlPremiumGuard],
  exports: [EntitlementService, PremiumGuard, GqlPremiumGuard],
})
export class EntitlementModule {}
