import { SetMetadata } from '@nestjs/common';
import type { StaffPermissionKey } from '@app/modules/platform/membership/permissions/staff-permission.registry';

export const STAFF_PERMISSION_KEY = 'staff_permission';

export const StaffPermission = (...permissions: StaffPermissionKey[]) =>
  SetMetadata(STAFF_PERMISSION_KEY, permissions);
