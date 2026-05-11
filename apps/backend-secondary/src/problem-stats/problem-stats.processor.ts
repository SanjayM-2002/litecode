import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUES, UpdateProblemStatsJob } from '@litecode/queue';
import { Job } from 'bullmq';
import { ProblemStatsService } from './problem-stats.service';

@Processor(QUEUES.updateProblemStats, {
  concurrency: 1, // single-writer to avoid row-level lock contention on hot problems
})
export class ProblemStatsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProblemStatsProcessor.name);

  constructor(private readonly stats: ProblemStatsService) {
    super();
  }

  async process(job: Job<UpdateProblemStatsJob>): Promise<void> {
    this.logger.log(
      `Applying stats for submission ${job.data.submissionId} (job ${job.id}, attempt ${job.attemptsMade + 1})`,
    );
    await this.stats.apply(job.data);
  }
}
