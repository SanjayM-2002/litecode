import { Injectable } from '@nestjs/common';
import { PrismaService } from '@litecode/db';
import { HealthIndicator, ServiceCheck } from '../health.types';


@Injectable()
export class PostgresIndicator implements HealthIndicator {
  readonly name = 'postgres';
  readonly critical = true;

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<ServiceCheck> {
    const started = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'up', latencyMs: Date.now() - started };
  }
}
