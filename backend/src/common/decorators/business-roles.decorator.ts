import { SetMetadata } from '@nestjs/common';
import { BusinessMemberRole } from '@prisma/client';

export const BUSINESS_ROLES_KEY = 'businessRoles';

export const BusinessRoles = (...roles: BusinessMemberRole[]) =>
  SetMetadata(BUSINESS_ROLES_KEY, roles);
