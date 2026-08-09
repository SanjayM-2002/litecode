import { Injectable } from '@nestjs/common';
import { CacheService } from '@litecode/cache';
import { HealthIndicator, ServiceCheck } from '../health.types';

/**
 * Not critical. Redis backs the cache and rate limiting; if it's down, reads
 * fall through to Postgres and the API keeps working — slower, not broken.
 * Reporting 503 here would take the whole service out of rotation over a cache
 * outage.
 */
@Injectable()
export class RedisIndicator implements HealthIndicator {
  readonly name = 'redis';
  readonly critical = false;

  constructor(private readonly cache: CacheService) {}

  async check(): Promise<ServiceCheck> {
    const started = Date.now();
    await this.cache.ping();
    return { status: 'up', latencyMs: Date.now() - started };
  }
}
