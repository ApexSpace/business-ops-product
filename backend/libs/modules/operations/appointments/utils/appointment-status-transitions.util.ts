import { HttpStatus } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';

/**
 * Allowed PATCH /appointments/:id/status targets, including same-status no-ops.
 * Terminal states (COMPLETED, CANCELLED, NO_SHOW) cannot reopen via this endpoint.
 *
 * Happy path: UNCONFIRMED → CONFIRMED → WAITING → IN_SERVICE → COMPLETED
 * WAITING is still gated separately when waiting-room is disabled.
 */
export const APPOINTMENT_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  readonly AppointmentStatus[]
> = {
  [AppointmentStatus.PENDING_COMPLETION]: [
    AppointmentStatus.PENDING_COMPLETION,
    AppointmentStatus.UNCONFIRMED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.UNCONFIRMED]: [
    AppointmentStatus.UNCONFIRMED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.WAITING,
    AppointmentStatus.IN_SERVICE,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.WAITING]: [
    AppointmentStatus.WAITING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_SERVICE,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.IN_SERVICE]: [
    AppointmentStatus.IN_SERVICE,
    AppointmentStatus.WAITING,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.COMPLETED]: [AppointmentStatus.COMPLETED],
  [AppointmentStatus.CANCELLED]: [AppointmentStatus.CANCELLED],
  [AppointmentStatus.NO_SHOW]: [AppointmentStatus.NO_SHOW],
};

export function isAllowedAppointmentStatusTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return APPOINTMENT_STATUS_TRANSITIONS[from].includes(to);
}

export function assertAllowedAppointmentStatusTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): void {
  if (isAllowedAppointmentStatusTransition(from, to)) {
    return;
  }
  throw new AppException(
    ErrorCode.BAD_REQUEST,
    `Cannot change appointment status from ${from} to ${to}`,
    HttpStatus.BAD_REQUEST,
  );
}
