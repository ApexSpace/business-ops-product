import { SetMetadata } from '@nestjs/common';
import { PlatformMemberRole } from '@prisma/client';

export const PLATFORM_ROLES_KEY = 'platformRoles';

export const PlatformRoles = (...roles: PlatformMemberRole[]) =>
  SetMetadata(PLATFORM_ROLES_KEY, roles);
