import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@litecode/queue';
import { ProblemStatsProcessor } from './problem-stats.processor';
import { ProblemStatsService } from './problem-stats.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.updateProblemStats })],
  providers: [ProblemStatsProcessor, ProblemStatsService],
})
export class ProblemStatsModule {}
