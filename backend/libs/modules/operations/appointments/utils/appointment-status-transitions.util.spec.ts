import { AppointmentStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  APPOINTMENT_STATUS_TRANSITIONS,
  assertAllowedAppointmentStatusTransition,
  isAllowedAppointmentStatusTransition,
} from './appointment-status-transitions.util';

describe('appointment-status-transitions', () => {
  const allStatuses = Object.values(AppointmentStatus);

  it('defines a transition list for every AppointmentStatus', () => {
    for (const status of allStatuses) {
      expect(APPOINTMENT_STATUS_TRANSITIONS[status]).toBeDefined();
      expect(APPOINTMENT_STATUS_TRANSITIONS[status].length).toBeGreaterThan(0);
    }
  });

  it.each([
    [AppointmentStatus.UNCONFIRMED, AppointmentStatus.CONFIRMED],
    [AppointmentStatus.CONFIRMED, AppointmentStatus.WAITING],
    [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_SERVICE],
    [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
    [AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW],
    [AppointmentStatus.WAITING, AppointmentStatus.IN_SERVICE],
    [AppointmentStatus.IN_SERVICE, AppointmentStatus.COMPLETED],
    [AppointmentStatus.PENDING_COMPLETION, AppointmentStatus.CONFIRMED],
    [AppointmentStatus.PENDING_COMPLETION, AppointmentStatus.CANCELLED],
    [AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED],
  ] as const)('allows %s → %s', (from, to) => {
    expect(isAllowedAppointmentStatusTransition(from, to)).toBe(true);
    expect(() =>
      assertAllowedAppointmentStatusTransition(from, to),
    ).not.toThrow();
  });

  it.each([
    [AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED],
    [AppointmentStatus.COMPLETED, AppointmentStatus.IN_SERVICE],
    [AppointmentStatus.CANCELLED, AppointmentStatus.IN_SERVICE],
    [AppointmentStatus.CANCELLED, AppointmentStatus.CONFIRMED],
    [AppointmentStatus.NO_SHOW, AppointmentStatus.CONFIRMED],
    [AppointmentStatus.UNCONFIRMED, AppointmentStatus.IN_SERVICE],
    [AppointmentStatus.UNCONFIRMED, AppointmentStatus.WAITING],
    [AppointmentStatus.WAITING, AppointmentStatus.COMPLETED],
    [AppointmentStatus.IN_SERVICE, AppointmentStatus.NO_SHOW],
    [AppointmentStatus.PENDING_COMPLETION, AppointmentStatus.IN_SERVICE],
  ] as const)('rejects %s → %s', (from, to) => {
    expect(isAllowedAppointmentStatusTransition(from, to)).toBe(false);
    try {
      assertAllowedAppointmentStatusTransition(from, to);
      throw new Error('expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      const response = exception.getResponse() as {
        code: ErrorCode;
        message: string;
      };
      expect(response.code).toBe(ErrorCode.BAD_REQUEST);
      expect(exception.getStatus()).toBe(400);
      expect(response.message).toContain(from);
      expect(response.message).toContain(to);
    }
  });
});
