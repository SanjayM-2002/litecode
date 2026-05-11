import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SolutionResolver } from './solution.resolver';
import { SolutionService } from './solution.service';

@Module({
  imports: [AuthModule],
  providers: [SolutionResolver, SolutionService],
})
export class SolutionModule {}
