import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformMemberRole } from '@prisma/client';
import { Request } from 'express';
import { PLATFORM_ROLES_KEY } from '../decorators/platform-roles.decorator';
import { RequestUser } from '../decorators/current-user.decorator';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-code.enum';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformMemberRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    if (!user || user.context !== 'platform' || !user.platformRole) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Platform access required',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!requiredRoles.includes(user.platformRole)) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Insufficient platform permissions',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
