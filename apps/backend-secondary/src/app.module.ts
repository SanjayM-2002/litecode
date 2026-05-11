import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@litecode/cache';
import { PrismaModule } from '@litecode/db';
import { getRedisConnection } from '@litecode/queue';
import { GraderModule } from './grader/grader.module';
import { ProblemStatsModule } from './problem-stats/problem-stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CacheModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: getRedisConnection(config.get<string>('REDIS_URL')),
      }),
    }),
    GraderModule,
    ProblemStatsModule,
  ],
})
export class AppModule {}
