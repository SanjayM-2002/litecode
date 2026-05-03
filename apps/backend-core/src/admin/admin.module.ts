import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './admin.service';
import { AdminPermissionsGuard } from './guards/admin-permissions.guard';

@Module({
  imports: [AuthModule],
  providers: [AdminResolver, AdminService, AdminPermissionsGuard],
})
export class AdminModule {}
