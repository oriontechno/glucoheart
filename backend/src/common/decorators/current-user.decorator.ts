import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    Logger.log('Current user in request:', request.user);
    return request.user;
  },
);
