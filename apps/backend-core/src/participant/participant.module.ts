import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ParticipantProblemResolver } from './participant-problem.resolver';
import { ParticipantProblemService } from './participant-problem.service';

@Module({
  imports: [AuthModule],
  providers: [ParticipantProblemResolver, ParticipantProblemService],
})
export class ParticipantModule {}
