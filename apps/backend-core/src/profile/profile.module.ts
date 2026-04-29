import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';

@Module({
  imports: [AuthModule],
  providers: [ProfileResolver, ProfileService],
})
export class ProfileModule {}
