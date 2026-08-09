import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JudgeModule } from '../judge/judge.module';
import { SubmissionResolver } from './submission.resolver';
import { SubmissionService } from './submission.service';

@Module({
  imports: [AuthModule, JudgeModule],
  providers: [SubmissionResolver, SubmissionService],
})
export class SubmissionModule {}
