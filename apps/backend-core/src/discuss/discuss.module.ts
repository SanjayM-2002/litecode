import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DiscussResolver } from './discuss.resolver';
import { DiscussService } from './discuss.service';

@Module({
  imports: [AuthModule],
  providers: [DiscussResolver, DiscussService],
})
export class DiscussModule {}
