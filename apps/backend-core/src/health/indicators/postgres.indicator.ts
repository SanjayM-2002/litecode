import { Injectable } from '@nestjs/common';
import { PrismaService } from '@litecode/db';
import { HealthIndicator, ServiceCheck } from '../health.types';

/**
 * The only critical dependency. Without Postgres there is no read path, no
 * write path, and nothing worth serving — so this is the one indicator that
 * can produce a 503.
 */
@Injectable()
export class PostgresIndicator implements HealthIndicator {
  readonly name = 'postgres';
  readonly critical = true;

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<ServiceCheck> {
    const started = Date.now();
    // $queryRaw rather than a model query: this must not depend on any table
    // existing, so a mid-migration schema can't fail the health check.
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'up', latencyMs: Date.now() - started };
  }
}
