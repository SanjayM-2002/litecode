import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { JwtPayload } from '../../auth/auth.service';
import { EntitlementService } from '../entitlement.service';

@Injectable()
export class GqlPremiumGuard implements CanActivate {
  constructor(private readonly entitlement: EntitlementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = GqlExecutionContext.create(context).getContext<{
      req: Request & { user?: JwtPayload };
    }>().req;
    const user = request.user;
    if (!user?.sub) throw new UnauthorizedException();

    if (!(await this.entitlement.isPremium(user.sub))) {
      throw new ForbiddenException('PREMIUM_REQUIRED');
    }
    return true;
  }
}
