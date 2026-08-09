import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PostgresIndicator } from './indicators/postgres.indicator';
import { RedisIndicator } from './indicators/redis.indicator';
import { RabbitMqIndicator } from './indicators/rabbitmq.indicator';
import { JudgeIndicator } from './indicators/judge.indicator';
import { BacklogIndicator } from './indicators/backlog.indicator';

// PrismaModule and CacheModule are both @Global(), so PrismaService and
// CacheService inject without being imported here. ConfigModule is registered
// with isGlobal too — listed anyway to keep the dependency visible.
@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    PostgresIndicator,
    RedisIndicator,
    RabbitMqIndicator,
    JudgeIndicator,
    BacklogIndicator,
  ],
})
export class HealthModule {}
