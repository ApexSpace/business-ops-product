import { AppointmentStatus, BusinessMemberRole } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import {
  assertCanChangeAppointmentStatus,
  assertCanMutateAppointment,
  assertCanViewAppointment,
  isOwnStaffAppointment,
} from './appointment-staff-access.util';

function member(
  permissions: Record<string, boolean>,
  id = 'staff-1',
): RequestUser {
  return {
    id,
    email: 'staff@example.com',
    context: 'business',
    businessId: 'biz-1',
    businessRole: BusinessMemberRole.MEMBER,
    staffPermissions: permissions,
  };
}

describe('appointment-staff-access.util', () => {
  it('treats primary assignee as own calendar', () => {
    expect(
      isOwnStaffAppointment({ assignedToId: 'staff-1' }, 'staff-1'),
    ).toBe(true);
    expect(
      isOwnStaffAppointment({ assignedToId: 'staff-2' }, 'staff-1'),
    ).toBe(false);
  });

  it('allows view_all without manage', () => {
    expect(() =>
      assertCanViewAppointment(member({ 'appointments.view_all_calendars': true }), {
        assignedToId: 'staff-2',
      }),
    ).not.toThrow();
  });

  it('blocks mutating others without manage_all', () => {
    expect(() =>
      assertCanMutateAppointment(
        member({ 'appointments.manage_own': true }),
        { assignedToId: 'staff-2' },
      ),
    ).toThrow(AppException);
  });

  it('allows mutating others with manage_all', () => {
    expect(() =>
      assertCanMutateAppointment(
        member({ 'appointments.manage_all': true }),
        { assignedToId: 'staff-2' },
      ),
    ).not.toThrow();
  });

  it('uses time block permissions separately', () => {
    expect(() =>
      assertCanMutateAppointment(
        member({ 'appointments.manage_own': true }),
        { assignedToId: 'staff-1', metadata: { kind: 'TIME_BLOCK' } },
      ),
    ).toThrow(AppException);

    expect(() =>
      assertCanMutateAppointment(
        member({ 'appointments.manage_own_time_blocks': true }),
        { assignedToId: 'staff-1', metadata: { kind: 'TIME_BLOCK' } },
      ),
    ).not.toThrow();
  });

  it('requires manage permission to cancel, not only change_status', () => {
    expect(() =>
      assertCanChangeAppointmentStatus(
        member({ 'appointments.change_status': true }),
        { assignedToId: 'staff-1' },
        AppointmentStatus.CANCELLED,
      ),
    ).toThrow(AppException);

    expect(() =>
      assertCanChangeAppointmentStatus(
        member({ 'appointments.manage_own': true }),
        { assignedToId: 'staff-1' },
        AppointmentStatus.CANCELLED,
      ),
    ).not.toThrow();
  });

  it('allows confirm/check-in with change_status on own calendar', () => {
    expect(() =>
      assertCanChangeAppointmentStatus(
        member({ 'appointments.change_status': true }),
        { assignedToId: 'staff-1' },
        AppointmentStatus.WAITING,
      ),
    ).not.toThrow();
  });
});
