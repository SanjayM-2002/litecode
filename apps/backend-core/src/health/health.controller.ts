import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { DeepHealth } from './health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}


  @Get()
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend-core',
    };
  }

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
