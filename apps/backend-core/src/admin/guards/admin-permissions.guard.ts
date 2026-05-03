import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AdminProfile, Permission, PrismaService, Role } from '@litecode/db';
import { Request } from 'express';
import { JwtPayload } from '../../auth/auth.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.get<Permission[]>(REQUIRED_PERMISSIONS_KEY, context.getHandler()) ?? [];

    const request = GqlExecutionContext.create(context).getContext<{
      req: Request & { user?: JwtPayload; adminProfile?: AdminProfile };
    }>().req;

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    const profile = await this.prisma.adminProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!profile) {
      throw new ForbiddenException('Admin profile not found');
    }

    if (required.length > 0) {
      const missing = required.filter((p) => !profile.permissions.includes(p));
      if (missing.length > 0) {
        throw new ForbiddenException(`Missing permissions: ${missing.join(', ')}`);
      }
    }

    request.adminProfile = profile;
    return true;
  }
}