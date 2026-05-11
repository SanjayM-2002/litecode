import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { GradeSubmissionJob, QUEUES } from '@litecode/queue';
import { Job } from 'bullmq';
import { GraderService } from './grader.service';

@Processor(QUEUES.gradeSubmission, {
  concurrency: 5, // small for RapidAPI free-tier rate limits; tune for self-hosted Judge0
})
export class GraderProcessor extends WorkerHost {
  private readonly logger = new Logger(GraderProcessor.name);

  constructor(private readonly grader: GraderService) {
    super();
  }

  async process(job: Job<GradeSubmissionJob>): Promise<void> {
    const { submissionId } = job.data;
    this.logger.log(`Grading submission ${submissionId} (job ${job.id}, attempt ${job.attemptsMade + 1})`);
    await this.grader.grade(submissionId);
  }
}
