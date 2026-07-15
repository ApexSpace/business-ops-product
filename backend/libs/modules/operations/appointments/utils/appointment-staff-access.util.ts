import { HttpStatus } from '@nestjs/common';
import { AppointmentStatus, BusinessMemberRole } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  canViewAllStaffCalendars,
  hasStaffPermission,
} from '@app/modules/platform/membership/permissions/staff-permission.registry';
import { isTimeBlockMetadata } from '@app/modules/operations/online-booking-settings/utils/gap-avoidance.util';

export type AppointmentAssigneeShape = {
  assignedToId?: string | null;
  createdById?: string | null;
  metadata?: unknown;
  serviceLines?: Array<{ assignedToId?: string | null }> | null;
};

export function isBusinessAdminRole(role?: string | null): boolean {
  return (
    role === BusinessMemberRole.OWNER || role === BusinessMemberRole.ADMIN
  );
}

/** True when this appointment belongs on the actor's own calendar. */
export function isOwnStaffAppointment(
  appointment: AppointmentAssigneeShape,
  userId: string,
): boolean {
  const primary = appointment.assignedToId ?? null;
  if (primary) {
    return primary === userId;
  }

  const lineIds = (appointment.serviceLines ?? [])
    .map((line) => line.assignedToId)
    .filter((id): id is string => Boolean(id));

  if (lineIds.length === 0) {
    return appointment.createdById === userId || !appointment.createdById;
  }

  return lineIds.every((id) => id === userId);
}

export function appointmentIsTimeBlock(
  appointment: AppointmentAssigneeShape,
): boolean {
  return isTimeBlockMetadata(appointment.metadata);
}

export function assertCanViewAppointment(
  user: RequestUser | undefined,
  appointment: AppointmentAssigneeShape,
): void {
  if (!user) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to view this appointment',
      HttpStatus.FORBIDDEN,
    );
  }
  if (isBusinessAdminRole(user.businessRole)) return;
  if (isOwnStaffAppointment(appointment, user.id)) return;
  if (canViewAllStaffCalendars(user.staffPermissions, user.businessRole)) {
    return;
  }
  // Allow open-by-id for staff who can manage the other person's booking/block.
  if (appointmentIsTimeBlock(appointment)) {
    if (
      hasStaffPermission(
        user.staffPermissions,
        'appointments.manage_all_time_blocks',
        user.businessRole,
      )
    ) {
      return;
    }
  } else if (
    hasStaffPermission(
      user.staffPermissions,
      'appointments.manage_all',
      user.businessRole,
    )
  ) {
    return;
  }

  throw new AppException(
    ErrorCode.FORBIDDEN,
    'You do not have permission to view other staff calendars',
    HttpStatus.FORBIDDEN,
  );
}

export function assertCanMutateAppointment(
  user: RequestUser | undefined,
  appointment: AppointmentAssigneeShape,
  options?: { isTimeBlock?: boolean },
): void {
  if (!user) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to change this appointment',
      HttpStatus.FORBIDDEN,
    );
  }
  if (isBusinessAdminRole(user.businessRole)) return;

  const isTimeBlock =
    options?.isTimeBlock ?? appointmentIsTimeBlock(appointment);
  const own = isOwnStaffAppointment(appointment, user.id);

  if (isTimeBlock) {
    const allowed = hasStaffPermission(
      user.staffPermissions,
      own
        ? 'appointments.manage_own_time_blocks'
        : 'appointments.manage_all_time_blocks',
      user.businessRole,
    );
    if (!allowed) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        own
          ? 'You do not have permission to manage your time blocks'
          : 'You do not have permission to manage other staff time blocks',
        HttpStatus.FORBIDDEN,
      );
    }
    return;
  }

  const allowed = hasStaffPermission(
    user.staffPermissions,
    own ? 'appointments.manage_own' : 'appointments.manage_all',
    user.businessRole,
  );
  if (!allowed) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      own
        ? 'You do not have permission to manage your appointments'
        : 'You do not have permission to manage other staff appointments',
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Status transitions (confirm, check-in, etc.) use change_status.
 * Cancelling requires book/change permission for that calendar (own vs other).
 */
export function assertCanChangeAppointmentStatus(
  user: RequestUser | undefined,
  appointment: AppointmentAssigneeShape,
  nextStatus: AppointmentStatus,
): void {
  if (!user) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to change appointment status',
      HttpStatus.FORBIDDEN,
    );
  }
  if (isBusinessAdminRole(user.businessRole)) return;

  if (nextStatus === AppointmentStatus.CANCELLED) {
    assertCanMutateAppointment(user, appointment);
    return;
  }

  if (
    !hasStaffPermission(
      user.staffPermissions,
      'appointments.change_status',
      user.businessRole,
    )
  ) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to change appointment status',
      HttpStatus.FORBIDDEN,
    );
  }

  // Status changes on another staff calendar still require visibility of that calendar.
  if (
    !isOwnStaffAppointment(appointment, user.id) &&
    !canViewAllStaffCalendars(user.staffPermissions, user.businessRole)
  ) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to view other staff calendars',
      HttpStatus.FORBIDDEN,
    );
  }
}

export function assertCanViewAppointmentHistory(
  user: RequestUser | undefined,
): void {
  if (!user) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to view appointment history',
      HttpStatus.FORBIDDEN,
    );
  }
  if (isBusinessAdminRole(user.businessRole)) return;
  if (
    hasStaffPermission(
      user.staffPermissions,
      'appointments.view_history',
      user.businessRole,
    )
  ) {
    return;
  }
  throw new AppException(
    ErrorCode.FORBIDDEN,
    'You do not have permission to view appointment change history',
    HttpStatus.FORBIDDEN,
  );
}
