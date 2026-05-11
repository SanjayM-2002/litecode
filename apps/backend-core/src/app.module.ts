import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@litecode/db';
import { getRedisConnection } from '@litecode/queue';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PingModule } from './ping/ping.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { AdminModule } from './admin/admin.module';
import { ParticipantModule } from './participant/participant.module';
import { SubmissionModule } from './submission/submission.module';
import { SolutionModule } from './solution/solution.module';
import { DiscussModule } from './discuss/discuss.module';
import { BullBoardModule } from './bull-board/bull-board.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: getRedisConnection(config.get<string>('REDIS_URL')),
      }),
    }),
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: true,
      csrfPrevention: false,
    }),
    HealthModule,
    PingModule,
    AuthModule,
    ProfileModule,
    AdminModule,
    ParticipantModule,
    SubmissionModule,
    SolutionModule,
    DiscussModule,
    BullBoardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
