import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessMemberRole } from '@prisma/client';
import { STAFF_PERMISSION_KEY } from '@app/common/decorators/staff-permission.decorator';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  hasStaffPermission,
  normalizeStaffPermissions,
  type StaffPermissionKey,
} from '@app/modules/platform/membership/permissions/staff-permission.registry';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { resolvePlatformBusinessRole } from '@app/modules/platform/auth/utils/platform-business-access.util';

@Injectable()
export class StaffPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membershipRepository: BusinessMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<StaffPermissionKey[]>(
      STAFF_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.context !== 'business' || !user.businessId) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Business context required',
        HttpStatus.FORBIDDEN,
      );
    }

    const effectiveRole = user.platformRole
      ? resolvePlatformBusinessRole(user.platformRole, user.businessRole)
      : user.businessRole;

    if (
      effectiveRole === BusinessMemberRole.OWNER ||
      effectiveRole === BusinessMemberRole.ADMIN
    ) {
      return true;
    }

    const membership =
      await this.membershipRepository.findByUserAndBusinessWithUser(
        user.id,
        user.businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Insufficient permissions',
        HttpStatus.FORBIDDEN,
      );
    }

    const permissions = normalizeStaffPermissions(membership.permissions);
    const allowed = required.some((key) =>
      hasStaffPermission(permissions, key, membership.role),
    );
    if (!allowed) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Insufficient permissions',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
