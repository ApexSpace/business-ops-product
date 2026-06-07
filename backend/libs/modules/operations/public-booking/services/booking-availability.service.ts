import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  Calendar,
  CalendarAvailability,
  CalendarException,
  DayOfWeek,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { normalizeTimezone } from '@app/common/utils/timezone.util';
import { AppointmentRepository } from '@app/modules/operations/appointments/repositories/appointment.repository';
import {
  PublicBookingDayAvailabilityDto,
  PublicBookingSlotDto,
} from '../dto/public-booking.dto';

const LUXON_WEEKDAY_TO_DAY: Record<number, DayOfWeek> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};

const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatSlotLabel(dt: DateTime): string {
  return dt.toFormat('h:mm a');
}

/** Public booking slots must not start more often than the event duration. */
function resolvePublicBookingSlotStep(
  durationMinutes: number,
  slotIntervalMinutes: number,
): number {
  if (slotIntervalMinutes < durationMinutes) {
    return durationMinutes;
  }
  return slotIntervalMinutes;
}

@Injectable()
export class BookingAvailabilityService {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async getAvailability(params: {
    calendar: Calendar;
    availability: CalendarAvailability[];
    exceptions: CalendarException[];
    from: Date;
    to: Date;
    viewerTimezone: string;
    staffId?: string;
  }): Promise<PublicBookingDayAvailabilityDto[]> {
    const calendarTz = normalizeTimezone(params.calendar.timezone);
    const viewerTz = normalizeTimezone(params.viewerTimezone);
    const now = DateTime.now().setZone(calendarTz);
    const minStart = now.plus({
      minutes: params.calendar.minimumNoticeMinutes,
    });
    const maxEnd = now.plus({ days: params.calendar.maxBookingDays }).endOf('day');

    const rangeStart = DateTime.fromJSDate(params.from, { zone: viewerTz })
      .setZone(calendarTz)
      .startOf('day');
    const rangeEnd = DateTime.fromJSDate(params.to, { zone: viewerTz })
      .setZone(calendarTz)
      .endOf('day');

    let cursor = rangeStart < now.startOf('day') ? now.startOf('day') : rangeStart;
    if (cursor > maxEnd) return [];

    const effectiveEnd = rangeEnd < maxEnd ? rangeEnd : maxEnd;
    const duration = params.calendar.defaultDurationMinutes;
    const interval = resolvePublicBookingSlotStep(
      duration,
      params.calendar.slotIntervalMinutes,
    );
    const bufferBefore = params.calendar.bufferBeforeMinutes;
    const bufferAfter = params.calendar.bufferAfterMinutes;
    const capacity = params.calendar.capacity;

    const appointments =
      await this.appointmentRepository.findBlockingInRange(
        params.calendar.businessId,
        params.calendar.id,
        cursor.toUTC().toJSDate(),
        effectiveEnd.toUTC().toJSDate(),
        params.staffId,
      );

    const availabilityByDay = new Map(
      params.availability.map((a) => [a.dayOfWeek, a]),
    );
    const exceptionsByDate = new Map(
      params.exceptions.map((e) => [
        DateTime.fromJSDate(e.date, { zone: calendarTz }).toISODate()!,
        e,
      ]),
    );

    const days: PublicBookingDayAvailabilityDto[] = [];

    while (cursor <= effectiveEnd) {
      const dateKey = cursor.toISODate()!;
      const dayOfWeek = LUXON_WEEKDAY_TO_DAY[cursor.weekday];
      const weekly = availabilityByDay.get(dayOfWeek);
      const exception = exceptionsByDate.get(dateKey);

      const slots: PublicBookingSlotDto[] = [];

      if (weekly?.isEnabled && !this.isDayFullyBlocked(exception)) {
        const windowStart = parseTimeToMinutes(weekly.startTime);
        const windowEnd = parseTimeToMinutes(weekly.endTime);
        const blockedRanges = this.getBlockedRangesForDay(
          exception,
          windowStart,
          windowEnd,
        );

        for (
          let startMin = windowStart;
          startMin + duration <= windowEnd;
          startMin += interval
        ) {
          const slotStart = cursor.set({
            hour: Math.floor(startMin / 60),
            minute: startMin % 60,
            second: 0,
            millisecond: 0,
          });
          const slotEnd = slotStart.plus({ minutes: duration });

          if (slotStart < minStart) continue;
          if (this.isMinutesBlocked(startMin, startMin + duration, blockedRanges)) {
            continue;
          }

          const occupied = this.countOverlapping(
            appointments,
            slotStart.toUTC().toJSDate(),
            slotEnd.toUTC().toJSDate(),
            bufferBefore,
            bufferAfter,
          );

          const available = occupied < capacity;
          if (!available) continue;

          slots.push({
            startAt: slotStart.toUTC().toISO()!,
            endAt: slotEnd.toUTC().toISO()!,
            label: formatSlotLabel(slotStart),
            available: true,
          });
        }
      }

      if (slots.length > 0) {
        days.push({ date: dateKey, slots });
      }

      cursor = cursor.plus({ days: 1 }).startOf('day');
    }

    return days;
  }

  async isSlotAvailable(params: {
    calendar: Calendar;
    availability: CalendarAvailability[];
    exceptions: CalendarException[];
    startAt: Date;
    endAt: Date;
    staffId?: string;
  }): Promise<boolean> {
    const calendarTz = normalizeTimezone(params.calendar.timezone);
    const start = DateTime.fromJSDate(params.startAt, { zone: 'utc' }).setZone(
      calendarTz,
    );
    const end = DateTime.fromJSDate(params.endAt, { zone: 'utc' }).setZone(
      calendarTz,
    );
    const now = DateTime.now().setZone(calendarTz);

    if (end <= start) return false;
    if (start < now.plus({ minutes: params.calendar.minimumNoticeMinutes })) {
      return false;
    }
    if (
      start >
      now.plus({ days: params.calendar.maxBookingDays }).endOf('day')
    ) {
      return false;
    }

    const durationMinutes = Math.round(end.diff(start, 'minutes').minutes);
    if (durationMinutes !== params.calendar.defaultDurationMinutes) {
      return false;
    }

    const dayOfWeek = LUXON_WEEKDAY_TO_DAY[start.weekday];
    const weekly = params.availability.find((a) => a.dayOfWeek === dayOfWeek);
    if (!weekly?.isEnabled) return false;

    const dateKey = start.toISODate()!;
    const exception = params.exceptions.find(
      (e) =>
        DateTime.fromJSDate(e.date, { zone: calendarTz }).toISODate() === dateKey,
    );
    if (this.isDayFullyBlocked(exception)) return false;

    const windowStart = parseTimeToMinutes(weekly.startTime);
    const windowEnd = parseTimeToMinutes(weekly.endTime);
    const startMin = start.hour * 60 + start.minute;
    const endMin = end.hour * 60 + end.minute;
    const interval = resolvePublicBookingSlotStep(
      params.calendar.defaultDurationMinutes,
      params.calendar.slotIntervalMinutes,
    );

    if (startMin < windowStart || endMin > windowEnd) return false;
    if ((startMin - windowStart) % interval !== 0) return false;

    const blockedRanges = this.getBlockedRangesForDay(
      exception,
      windowStart,
      windowEnd,
    );
    if (this.isMinutesBlocked(startMin, endMin, blockedRanges)) return false;

    const appointments =
      await this.appointmentRepository.findBlockingInRange(
        params.calendar.businessId,
        params.calendar.id,
        start.minus({ minutes: params.calendar.bufferBeforeMinutes }).toUTC().toJSDate(),
        end.plus({ minutes: params.calendar.bufferAfterMinutes }).toUTC().toJSDate(),
        params.staffId,
      );

    const occupied = this.countOverlapping(
      appointments,
      params.startAt,
      params.endAt,
      params.calendar.bufferBeforeMinutes,
      params.calendar.bufferAfterMinutes,
    );

    return occupied < params.calendar.capacity;
  }

  private isDayFullyBlocked(exception?: CalendarException): boolean {
    if (!exception?.isUnavailable) return false;
    return !exception.startTime && !exception.endTime;
  }

  private getBlockedRangesForDay(
    exception: CalendarException | undefined,
    windowStart: number,
    windowEnd: number,
  ): Array<{ start: number; end: number }> {
    if (!exception?.isUnavailable) return [];
    if (!exception.startTime && !exception.endTime) {
      return [{ start: windowStart, end: windowEnd }];
    }
    const start = exception.startTime
      ? parseTimeToMinutes(exception.startTime)
      : windowStart;
    const end = exception.endTime
      ? parseTimeToMinutes(exception.endTime)
      : windowEnd;
    return [{ start, end }];
  }

  private isMinutesBlocked(
    slotStart: number,
    slotEnd: number,
    blocked: Array<{ start: number; end: number }>,
  ): boolean {
    return blocked.some((b) => slotStart < b.end && slotEnd > b.start);
  }

  private countOverlapping(
    appointments: Array<{ startAt: Date; endAt: Date }>,
    slotStart: Date,
    slotEnd: Date,
    bufferBefore: number,
    bufferAfter: number,
  ): number {
    const blockStart = new Date(
      slotStart.getTime() - bufferBefore * 60 * 1000,
    );
    const blockEnd = new Date(slotEnd.getTime() + bufferAfter * 60 * 1000);

    return appointments.filter(
      (a) => a.startAt < blockEnd && a.endAt > blockStart,
    ).length;
  }
}
