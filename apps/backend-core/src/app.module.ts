import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@litecode/cache';
import { PrismaModule } from '@litecode/db';
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
import { EntitlementModule } from './entitlement/entitlement.module';
import { AiModule } from './ai/ai.module';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // RabbitMQ is registered inside JudgeModule, not here — see the note there.
    PrismaModule,
    CacheModule,
    EntitlementModule,
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
    AiModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
