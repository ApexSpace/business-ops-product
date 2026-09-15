import {
  AppointmentSource,
  AppointmentStatus,
  SelfCancellationMode,
  SelfRescheduleMode,
} from '@prisma/client';
import {
  canClientCancel,
  canClientReschedule,
  classifyStaffCancellation,
} from './cancel-reschedule-behavior.util';

describe('cancel-reschedule-behavior.util', () => {
  const baseSettings = {
    selfCancellationMode: SelfCancellationMode.UNTIL_HOURS_BEFORE_APPOINTMENT,
    selfCancellationMinutes: 15,
    selfCancellationHoursBefore: 24,
    selfRescheduleMode: SelfRescheduleMode.UNTIL_HOURS_BEFORE_APPOINTMENT,
    selfRescheduleHoursBefore: 24,
    lateCancellationHoursBefore: 24,
  };

  const baseAppointment = {
    status: AppointmentStatus.CONFIRMED,
    source: AppointmentSource.PUBLIC_LINK,
    startAt: new Date('2026-09-10T15:00:00.000Z'),
    bookedAt: new Date('2026-09-01T12:00:00.000Z'),
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
  };

  it('allows cancel when enough hours remain', () => {
    expect(
      canClientCancel(
        baseSettings,
        baseAppointment,
        new Date('2026-09-09T14:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('blocks cancel inside hours-before window', () => {
    expect(
      canClientCancel(
        baseSettings,
        baseAppointment,
        new Date('2026-09-10T14:30:00.000Z'),
      ),
    ).toBe(false);
  });

  it('allows online grace cancel within minutes of booking', () => {
    expect(
      canClientCancel(
        {
          ...baseSettings,
          selfCancellationMode:
            SelfCancellationMode.WITHIN_MINUTES_OF_ONLINE_BOOKING,
        },
        baseAppointment,
        new Date('2026-09-01T12:10:00.000Z'),
      ),
    ).toBe(true);
  });

  it('blocks online grace cancel for internal appointments', () => {
    expect(
      canClientCancel(
        {
          ...baseSettings,
          selfCancellationMode:
            SelfCancellationMode.WITHIN_MINUTES_OF_ONLINE_BOOKING,
        },
        { ...baseAppointment, source: AppointmentSource.INTERNAL },
        new Date('2026-09-01T12:10:00.000Z'),
      ),
    ).toBe(false);
  });

  it('allows reschedule when enough hours remain', () => {
    expect(
      canClientReschedule(
        baseSettings,
        baseAppointment,
        new Date('2026-09-09T14:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('classifies staff cancel within late window', () => {
    expect(
      classifyStaffCancellation(
        baseSettings,
        { startAt: new Date('2026-09-10T15:00:00.000Z') },
        new Date('2026-09-10T10:00:00.000Z'),
      ),
    ).toBe('late');
  });

  it('classifies staff cancel outside late window as normal', () => {
    expect(
      classifyStaffCancellation(
        baseSettings,
        { startAt: new Date('2026-09-10T15:00:00.000Z') },
        new Date('2026-09-08T10:00:00.000Z'),
      ),
    ).toBe('normal');
  });
});
