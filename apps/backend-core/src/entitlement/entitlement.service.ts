import { Injectable } from '@nestjs/common';
import { CacheService, cacheKeys } from '@litecode/cache';
import { PrismaService } from '@litecode/db';
import { UserTier } from '@litecode/shared-types';

const TIER_TTL_SEC = 300; // 5 min

@Injectable()
export class EntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getTier(userId: string): Promise<UserTier> {
    const tier = await this.cache.getOrSet<UserTier>(
      cacheKeys.userTier(userId),
      TIER_TTL_SEC,
      async () => {
        const row = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { tier: true },
        });
        return (row?.tier ?? UserTier.FREE) as UserTier;
      },
    );
    return tier;
  }

  async isPremium(userId: string): Promise<boolean> {
    return (await this.getTier(userId)) === UserTier.PREMIUM;
  }

  async invalidate(userId: string): Promise<void> {
    await this.cache.del(cacheKeys.userTier(userId));
  }
}
