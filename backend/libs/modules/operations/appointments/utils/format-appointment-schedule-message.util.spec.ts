import {
  formatAppointmentTimeRange,
  formatStaffScheduleConflictMessage,
} from './format-appointment-schedule-message.util';

describe('formatAppointmentTimeRange', () => {
  it('formats same-day appointment range in business timezone', () => {
    const start = new Date('2026-07-15T05:30:00.000Z');
    const end = new Date('2026-07-15T07:00:00.000Z');

    expect(formatAppointmentTimeRange(start, end, 'Asia/Karachi')).toBe(
      'Wed, Jul 15 from 10:30 AM to 12:00 PM',
    );
  });
});

describe('formatStaffScheduleConflictMessage', () => {
  it('returns a user-friendly conflict sentence', () => {
    const message = formatStaffScheduleConflictMessage(
      new Date('2026-07-15T05:30:00.000Z'),
      new Date('2026-07-15T07:00:00.000Z'),
      'Asia/Karachi',
    );

    expect(message).toBe(
      'This staff member is already booked Wed, Jul 15 from 10:30 AM to 12:00 PM. Please choose a different time.',
    );
  });
});
