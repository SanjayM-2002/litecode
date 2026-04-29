import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { JwtPayload } from '../auth.service';

export const GqlCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = GqlExecutionContext.create(ctx).getContext<{
      req: Request & { user: JwtPayload };
    }>().req;
    return request.user;
  },
);
