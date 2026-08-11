import { Injectable } from '@nestjs/common';
import { CacheService } from '@litecode/cache';
import { HealthIndicator, ServiceCheck } from '../health.types';


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
