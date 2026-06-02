import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessMemberRole } from '@prisma/client';
import { Request } from 'express';
import { isPlatformBusinessAdmin } from '../../modules/auth/utils/platform-business-access.util';
import { BUSINESS_ROLES_KEY } from '../decorators/business-roles.decorator';
import { RequestUser } from '../decorators/current-user.decorator';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-code.enum';

@Injectable()
export class BusinessRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<BusinessMemberRole[]>(
      BUSINESS_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    if (
      !user ||
      user.context !== 'business' ||
      !user.businessId ||
      !user.businessRole
    ) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Business context required',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!requiredRoles.includes(user.businessRole)) {
      if (
        user.platformRole &&
        isPlatformBusinessAdmin(user.platformRole) &&
        requiredRoles.includes(BusinessMemberRole.ADMIN)
      ) {
        return true;
      }
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Insufficient business permissions',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
