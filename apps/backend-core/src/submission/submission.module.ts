import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@litecode/queue';
import { AuthModule } from '../auth/auth.module';
import { SubmissionResolver } from './submission.resolver';
import { SubmissionService } from './submission.service';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: QUEUES.gradeSubmission }),
  ],
  providers: [SubmissionResolver, SubmissionService],
})
export class SubmissionModule {}
