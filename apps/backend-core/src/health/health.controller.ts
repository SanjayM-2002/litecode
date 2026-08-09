import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { DeepHealth } from './health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Liveness. Answers "is this process wedged", nothing more.
   *
   * Deliberately touches no dependencies. A liveness probe that checks Redis
   * or the database turns a dependency blip into a restart loop: the probe
   * fails, the orchestrator kills a perfectly healthy process, the replacement
   * hits the same blip. Dependency checks belong on /health/deep.
   */
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend-core',
    };
  }

  /**
   * Every dependency, checked in parallel.
   *
   * 503 only when a service marked `critical` is down — today that's Postgres
   * alone. Redis, RabbitMQ and the judge workers report `degraded` instead,
   * because the API still serves without them and a 503 would pull this
   * instance out of rotation over a partial outage.
   */
  @Get('deep')
  async checkDeep(
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeepHealth> {
    const result = await this.health.deep();
    res.status(
      result.status === 'error'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK,
    );
    return result;
  }
}
