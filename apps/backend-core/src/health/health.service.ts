import { Injectable, Logger } from '@nestjs/common';
import { DeepHealth, HealthIndicator, ServiceCheck } from './health.types';
import { PostgresIndicator } from './indicators/postgres.indicator';
import { RedisIndicator } from './indicators/redis.indicator';
import { RabbitMqIndicator } from './indicators/rabbitmq.indicator';
import { JudgeIndicator } from './indicators/judge.indicator';
import { BacklogIndicator } from './indicators/backlog.indicator';


const CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly indicators: HealthIndicator[];

  constructor(
    postgres: PostgresIndicator,
    redis: RedisIndicator,
    rabbitmq: RabbitMqIndicator,
    judge: JudgeIndicator,
    backlog: BacklogIndicator,
  ) {
    this.indicators = [postgres, redis, rabbitmq, judge, backlog];
  }

  async deep(): Promise<DeepHealth> {
    const started = Date.now();

    const entries = await Promise.all(this.indicators.map((i) => this.run(i)));
    const services = Object.fromEntries(entries) as Record<string, ServiceCheck>;

    const criticalDown = this.indicators.some(
      (i) => i.critical && services[i.name]?.status !== 'up',
    );
    const anythingOff = Object.values(services).some((s) => s.status !== 'up');

    return {
      status: criticalDown ? 'error' : anythingOff ? 'degraded' : 'ok',
      service: 'backend-core',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      services,
    };
  }

  private async run(indicator: HealthIndicator): Promise<[string, ServiceCheck]> {
    const started = Date.now();
    try {
      const check = await withTimeout(
        indicator.check(),
        CHECK_TIMEOUT_MS,
        indicator.name,
      );
      return [indicator.name, { critical: indicator.critical, ...check }];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`health check "${indicator.name}" failed: ${message}`);
      return [
        indicator.name,
        {
          status: 'down',
          critical: indicator.critical,
          latencyMs: Date.now() - started,
          message,
        },
      ];
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} check timed out after ${ms}ms`)),
      ms,
    );
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
