import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JDoodleClient,
  JudgeClient,
  PistonClient,
  RapidApiJudge0Client,
} from '@litecode/judge';
import { QUEUES } from '@litecode/queue';
import { GraderProcessor } from './grader.processor';
import { GraderService } from './grader.service';
import { JUDGE_CLIENT } from './judge.token';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.gradeSubmission },
      { name: QUEUES.updateProblemStats },
    ),
  ],
  providers: [
    GraderProcessor,
    GraderService,
    {
      provide: JUDGE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): JudgeClient => {
        const provider = (config.get<string>('JUDGE_PROVIDER') ?? 'jdoodle').toLowerCase();

        if (provider === 'judge0') {
          return new RapidApiJudge0Client({
            baseUrl: config.getOrThrow<string>('JUDGE0_BASE_URL'),
            rapidApiKey: config.getOrThrow<string>('JUDGE0_RAPIDAPI_KEY'),
            rapidApiHost: config.getOrThrow<string>('JUDGE0_RAPIDAPI_HOST'),
          });
        }

        if (provider === 'piston') {
          return new PistonClient({
            baseUrl:
              config.get<string>('PISTON_BASE_URL') ?? 'https://emkc.org/api/v2/piston',
            apiKey: config.get<string>('PISTON_API_KEY'),
          });
        }

        if (provider === 'jdoodle') {
          return new JDoodleClient({
            baseUrl:
              config.get<string>('JDOODLE_BASE_URL') ?? 'https://api.jdoodle.com/v1',
            clientId: config.getOrThrow<string>('JDOODLE_CLIENT_ID'),
            clientSecret: config.getOrThrow<string>('JDOODLE_CLIENT_SECRET'),
            dryRun: config.get<string>('JDOODLE_DRY_RUN') === 'true',
          });
        }

        throw new Error(
          `Unknown JUDGE_PROVIDER "${provider}". Use "jdoodle", "piston", or "judge0".`,
        );
      },
    },
  ],
})
export class GraderModule {}
