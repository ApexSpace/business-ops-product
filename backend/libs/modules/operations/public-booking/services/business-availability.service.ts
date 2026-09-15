import { Injectable } from '@nestjs/common';
import {
  BusinessHourException,
  BusinessHours,
  DayOfWeek,
  StaffWorkException,
  StaffWorkSchedule,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { normalizeTimezone, parseCalendarDateKey } from '@app/common/utils/timezone.util';
import { resolveEffectiveWeeklyHours } from '@app/modules/operations/online-booking-settings/utils/effective-working-hours.util';
import {
  resolveGapAvoidancePolicy,
  slotPassesGapAvoidanceForStaffIds,
} from '@app/modules/operations/online-booking-settings/utils/gap-avoidance.util';
import { resolveBookingTimezone } from '@app/modules/operations/online-booking-settings/utils/resolve-booking-timezone.util';
import { AppointmentRepository } from '@app/modules/operations/appointments/repositories/appointment.repository';
import { SchedulingSettingsRepository } from '@app/modules/operations/scheduling-settings/repositories/scheduling-settings.repository';
import {
  resolveEffectiveBuffers,
} from '@app/modules/operations/scheduling-settings/utils/scheduling-behavior.util';
import {
  countClientOccupancyOverlaps,
} from '@app/modules/operations/appointments/utils/appointment-blocking.util';
import type { PublicBookingTimingContext } from '@app/modules/crm/services/services/service-booking-timing.service';
import type { BusinessBookingContext } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import {
  PublicBookingChainedSlotLineDto,
  PublicBookingDayAvailabilityDto,
  PublicBookingSlotDto,
} from '../dto/public-booking.dto';
import {
  type ChainedBookingLineInput,
  type ResolvedChainedSegment,
  sumChainOccupancy,
  validateChainedStart,
} from '../utils/chained-booking-availability.util';

const LUXON_WEEKDAY_TO_DAY: Record<number, DayOfWeek> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatSlotLabel(dt: DateTime): string {
  return dt.toFormat('h:mm a');
}

function resolvePublicBookingSlotStep(
  durationMinutes: number,
  slotIntervalMinutes: number,
): number {
  if (slotIntervalMinutes < durationMinutes) {
    return durationMinutes;
  }
  return slotIntervalMinutes;
}

type WeeklyHours = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

type BlockingAppointment = {
  id: string;
  startAt: Date;
  endAt: Date;
  assignedToId: string | null;
  metadata?: unknown;
  serviceLines?: Array<{ assignedToId: string | null }>;
};

function appointmentAssignedToStaff(
  appointment: {
    assignedToId: string | null;
    serviceLines?: Array<{ assignedToId: string | null }>;
  },
  staffId: string,
): boolean {
  if (appointment.assignedToId === staffId) return true;
  return (
    appointment.serviceLines?.some((line) => line.assignedToId === staffId) ??
    false
  );
}

function appointmentsOverlappingDay<T extends { startAt: Date; endAt: Date }>(
  appointments: T[],
  dayStartUtc: Date,
  dayEndUtc: Date,
): T[] {
  return appointments.filter(
    (appointment) =>
      appointment.startAt < dayEndUtc && appointment.endAt > dayStartUtc,
  );
}

function staffAppointments(
  appointments: BlockingAppointment[],
  staffId: string,
): BlockingAppointment[] {
  return appointments.filter((appointment) =>
    appointmentAssignedToStaff(appointment, staffId),
  );
}

type DayException = {
  date: Date;
  startTime: string | null;
  endTime: string | null;
  isUnavailable: boolean;
};

@Injectable()
export class BusinessAvailabilityService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly schedulingSettingsRepository: SchedulingSettingsRepository,
  ) {}

  private async resolveBufferMinutes(params: {
    businessId: string;
    settings: BusinessBookingContext;
    timing?: PublicBookingTimingContext | null;
  }) {
    const scheduling =
      await this.schedulingSettingsRepository.ensureSettings(params.businessId);
    return resolveEffectiveBuffers({
      bufferTimeEnabled: scheduling.bufferTimeEnabled,
      timing: params.timing ?? null,
      businessFallback: {
        bufferBeforeMinutes: params.settings.bufferBeforeMinutes,
        bufferAfterMinutes: params.settings.bufferAfterMinutes,
      },
    });
  }

  private async getChainedSchedulingContext(
    businessId: string,
    settings: BusinessBookingContext,
  ) {
    const scheduling =
      await this.schedulingSettingsRepository.ensureSettings(businessId);
    return {
      bufferTimeEnabled: scheduling.bufferTimeEnabled,
      businessFallback: {
        bufferBeforeMinutes: settings.bufferBeforeMinutes,
        bufferAfterMinutes: settings.bufferAfterMinutes,
      },
    };
  }

  async getAvailability(params: {
    settings: BusinessBookingContext;
    businessHours: BusinessHours[];
    businessExceptions: BusinessHourException[];
    staffSchedules?: StaffWorkSchedule[];
    staffExceptions?: StaffWorkException[];
    from: Date;
    to: Date;
    viewerTimezone: string;
    staffId?: string;
    eligibleStaffIds?: string[];
    timing?: PublicBookingTimingContext | null;
    gapPolicy?: ReturnType<typeof resolveGapAvoidancePolicy>;
    allowMultipleServices?: boolean;
    secondaryStaffId?: string;
  }): Promise<PublicBookingDayAvailabilityDto[]> {
    const businessTz = resolveBookingTimezone(
      params.settings.timezone,
      params.settings.business.timezone,
    );
    const viewerTz = normalizeTimezone(params.viewerTimezone);
    const now = DateTime.now().setZone(businessTz);
    const minStart = now.plus({
      minutes: params.settings.minimumNoticeMinutes,
    });
    const maxEnd = now
      .plus({ days: params.settings.maxBookingDays })
      .endOf('day');

    const rangeStart = DateTime.fromJSDate(params.from, { zone: viewerTz })
      .setZone(businessTz)
      .startOf('day');
    const rangeEnd = DateTime.fromJSDate(params.to, { zone: viewerTz })
      .setZone(businessTz)
      .endOf('day');

    let cursor =
      rangeStart < now.startOf('day') ? now.startOf('day') : rangeStart;
    if (cursor > maxEnd) return [];

    const effectiveEnd = rangeEnd < maxEnd ? rangeEnd : maxEnd;
    const { bufferBeforeMinutes: bufferBefore, bufferAfterMinutes: bufferAfter } =
      await this.resolveBufferMinutes({
        businessId: params.settings.businessId,
        settings: params.settings,
        timing: params.timing,
      });
    const clientOccupancy = params.timing?.clientOccupancyMinutes ?? 30;
    const duration =
      params.timing?.slotDurationMinutes ??
      clientOccupancy + bufferBefore + bufferAfter;
    const interval = resolvePublicBookingSlotStep(
      duration,
      params.settings.slotIntervalMinutes,
    );

    const gapPolicy =
      params.gapPolicy ??
      resolveGapAvoidancePolicy({
        avoidGapsEnabled: false,
      });
    const fallbackBuffers = {
      bufferBeforeMinutes: bufferBefore,
      bufferAfterMinutes: bufferAfter,
    };

    const weeklyHours = resolveEffectiveWeeklyHours(
      params.businessHours,
      params.staffSchedules?.length ? params.staffSchedules : undefined,
    );
    const exceptions = this.mergeExceptions(
      params.businessExceptions,
      params.staffExceptions,
      businessTz,
    );

    const appointments: BlockingAppointment[] =
      await this.appointmentRepository.findBlockingInRangeForStaff(
        params.settings.businessId,
        cursor.toUTC().toJSDate(),
        effectiveEnd.toUTC().toJSDate(),
      );

    const days: PublicBookingDayAvailabilityDto[] = [];

    while (cursor <= effectiveEnd) {
      const dateKey = cursor.toISODate()!;
      const dayOfWeek = LUXON_WEEKDAY_TO_DAY[cursor.weekday];
      const weekly = weeklyHours.find((h) => h.dayOfWeek === dayOfWeek);
      const exception = exceptions.get(dateKey);

      const slots: PublicBookingSlotDto[] = [];
      const dayStartUtc = cursor.startOf('day').toUTC().toJSDate();
      const dayEndUtc = cursor.endOf('day').toUTC().toJSDate();
      const dayAppts = appointmentsOverlappingDay(
        appointments,
        dayStartUtc,
        dayEndUtc,
      );

      const dayIsOpen =
        Boolean(weekly?.isEnabled) && !this.isDayFullyBlocked(exception);

      if (dayIsOpen && weekly) {
        const windowStart = parseTimeToMinutes(weekly.startTime);
        const windowEnd = parseTimeToMinutes(weekly.endTime);
        const blockedRanges = this.getBlockedRangesForDay(
          exception,
          windowStart,
          windowEnd,
        );
        const clientOccupancy =
          params.timing?.clientOccupancyMinutes ?? duration;

        for (
          let startMin = windowStart;
          startMin + clientOccupancy <= windowEnd;
          startMin += interval
        ) {
          const slotStart = cursor.set({
            hour: Math.floor(startMin / 60),
            minute: startMin % 60,
            second: 0,
            millisecond: 0,
          });
          const slotEnd = slotStart.plus({ minutes: clientOccupancy });

          if (slotStart < minStart) continue;
          if (
            this.isMinutesBlocked(
              startMin,
              startMin + clientOccupancy,
              blockedRanges,
            )
          ) {
            continue;
          }

          const slotStartUtc = slotStart.toUTC().toJSDate();
          const slotEndUtc = slotEnd.toUTC().toJSDate();

          if (params.staffId) {
            if (
              this.countClientOccupancyOverlapping(
                staffAppointments(appointments, params.staffId),
                slotStartUtc,
                slotEndUtc,
              ) > 0
            ) {
              continue;
            }

            const staffIds = [params.staffId];
            if (params.secondaryStaffId) {
              staffIds.push(params.secondaryStaffId);
            }
            if (
              !slotPassesGapAvoidanceForStaffIds({
                slotStartMin: startMin,
                slotEndMin: startMin + clientOccupancy,
                shiftStartMin: windowStart,
                shiftEndMin: windowEnd,
                slotDurationMin: clientOccupancy,
                slotIntervalMin: interval,
                staffIds,
                appointments: dayAppts,
                tz: businessTz,
                fallbackBuffers,
                policy: gapPolicy,
                allowMultipleServices: params.allowMultipleServices,
              })
            ) {
              continue;
            }
          } else if (params.eligibleStaffIds?.length) {
            const anyFree = params.eligibleStaffIds.some((staffId) => {
              if (
                this.countClientOccupancyOverlapping(
                  staffAppointments(appointments, staffId),
                  slotStartUtc,
                  slotEndUtc,
                ) > 0
              ) {
                return false;
              }

              return slotPassesGapAvoidanceForStaffIds({
                slotStartMin: startMin,
                slotEndMin: startMin + clientOccupancy,
                shiftStartMin: windowStart,
                shiftEndMin: windowEnd,
                slotDurationMin: clientOccupancy,
                slotIntervalMin: interval,
                staffIds: [staffId],
                appointments: dayAppts,
                tz: businessTz,
                fallbackBuffers,
                policy: gapPolicy,
                allowMultipleServices: params.allowMultipleServices,
              });
            });
            if (!anyFree) continue;
          } else {
            continue;
          }

          slots.push({
            startAt: slotStart.toUTC().toISO()!,
            endAt: slotEnd.toUTC().toISO()!,
            label: formatSlotLabel(slotStart),
            available: true,
            ...(params.staffId ? { staffId: params.staffId } : {}),
          });
        }
      }

      // When waitlist is on, include open working days with zero slots so
      // customers can still select that date and join the waitlist.
      if (
        slots.length > 0 ||
        (params.settings.waitlistEnabled && dayIsOpen)
      ) {
        days.push({ date: dateKey, slots });
      }

      cursor = cursor.plus({ days: 1 }).startOf('day');
    }

    return days;
  }

  async getChainedAvailability(params: {
    settings: BusinessBookingContext;
    businessHours: BusinessHours[];
    businessExceptions: BusinessHourException[];
    chain: ChainedBookingLineInput[];
    from: Date;
    to: Date;
    viewerTimezone: string;
    gapPolicy?: ReturnType<typeof resolveGapAvoidancePolicy>;
    allowMultipleServices?: boolean;
  }): Promise<PublicBookingDayAvailabilityDto[]> {
    if (params.chain.length === 0) return [];

    if (params.chain.length === 1) {
      const line = params.chain[0];
      return this.getAvailability({
        settings: params.settings,
        businessHours: params.businessHours,
        businessExceptions: params.businessExceptions,
        from: params.from,
        to: params.to,
        viewerTimezone: params.viewerTimezone,
        staffId: line.staffId,
        eligibleStaffIds: line.eligibleStaffIds,
        timing: line.timing,
        gapPolicy: params.gapPolicy,
        allowMultipleServices: params.allowMultipleServices,
      });
    }

    const businessTz = resolveBookingTimezone(
      params.settings.timezone,
      params.settings.business.timezone,
    );
    const viewerTz = normalizeTimezone(params.viewerTimezone);
    const now = DateTime.now().setZone(businessTz);
    const minStart = now.plus({
      minutes: params.settings.minimumNoticeMinutes,
    });
    const maxEnd = now
      .plus({ days: params.settings.maxBookingDays })
      .endOf('day');

    const rangeStart = DateTime.fromJSDate(params.from, { zone: viewerTz })
      .setZone(businessTz)
      .startOf('day');
    const rangeEnd = DateTime.fromJSDate(params.to, { zone: viewerTz })
      .setZone(businessTz)
      .endOf('day');

    let cursor =
      rangeStart < now.startOf('day') ? now.startOf('day') : rangeStart;
    if (cursor > maxEnd) return [];

    const effectiveEnd = rangeEnd < maxEnd ? rangeEnd : maxEnd;
    const totalOccupancy = sumChainOccupancy(params.chain);
    const firstTiming = params.chain[0]?.timing;
    const { bufferBeforeMinutes: bufferBefore, bufferAfterMinutes: bufferAfter } =
      await this.resolveBufferMinutes({
        businessId: params.settings.businessId,
        settings: params.settings,
        timing: firstTiming ?? null,
      });
    const interval = resolvePublicBookingSlotStep(
      totalOccupancy,
      params.settings.slotIntervalMinutes,
    );

    const gapPolicy =
      params.gapPolicy ??
      resolveGapAvoidancePolicy({
        avoidGapsEnabled: false,
      });

    const scheduling = await this.getChainedSchedulingContext(
      params.settings.businessId,
      params.settings,
    );

    // Prefer staff timetable when every line shares the same provider.
    const sharedStaffHours =
      params.chain[0]?.staffId &&
      params.chain.every((line) => line.staffId === params.chain[0]?.staffId)
        ? params.chain[0]?.weeklyHours
        : undefined;
    const weeklyHours =
      sharedStaffHours?.length
        ? sharedStaffHours
        : resolveEffectiveWeeklyHours(params.businessHours, undefined);
    const exceptions = this.mergeExceptions(
      params.businessExceptions,
      undefined,
      businessTz,
    );

    const appointments: BlockingAppointment[] =
      await this.appointmentRepository.findBlockingInRangeForStaff(
        params.settings.businessId,
        cursor.toUTC().toJSDate(),
        effectiveEnd.toUTC().toJSDate(),
      );

    const days: PublicBookingDayAvailabilityDto[] = [];

    while (cursor <= effectiveEnd) {
      const dateKey = cursor.toISODate()!;
      const dayOfWeek = LUXON_WEEKDAY_TO_DAY[cursor.weekday];
      const weekly = weeklyHours.find((h) => h.dayOfWeek === dayOfWeek);
      const exception = exceptions.get(dateKey);

      const slots: PublicBookingSlotDto[] = [];
      const dayStartUtc = cursor.startOf('day').toUTC().toJSDate();
      const dayEndUtc = cursor.endOf('day').toUTC().toJSDate();
      const dayAppts = appointmentsOverlappingDay(
        appointments,
        dayStartUtc,
        dayEndUtc,
      );

      const dayIsOpen =
        Boolean(weekly?.isEnabled) && !this.isDayFullyBlocked(exception);

      if (dayIsOpen && weekly) {
        const windowStart = parseTimeToMinutes(weekly.startTime);
        const windowEnd = parseTimeToMinutes(weekly.endTime);
        const blockedRanges = this.getBlockedRangesForDay(
          exception,
          windowStart,
          windowEnd,
        );

        for (
          let startMin = windowStart;
          startMin + totalOccupancy <= windowEnd;
          startMin += interval
        ) {
          const slotStart = cursor.set({
            hour: Math.floor(startMin / 60),
            minute: startMin % 60,
            second: 0,
            millisecond: 0,
          });

          if (slotStart < minStart) continue;
          if (
            this.isMinutesBlocked(
              startMin,
              startMin + totalOccupancy,
              blockedRanges,
            )
          ) {
            continue;
          }

          const resolved = validateChainedStart({
            chainStart: slotStart,
            chain: params.chain,
            windowStartMin: windowStart,
            windowEndMin: windowEnd,
            slotIntervalMin: interval,
            appointments,
            dayAppointments: dayAppts,
            tz: businessTz,
            gapPolicy,
            allowMultipleServices: params.allowMultipleServices,
            scheduling,
          });

          if (!resolved) continue;

          const chainEnd = slotStart.plus({ minutes: totalOccupancy });
          const serviceLines: PublicBookingChainedSlotLineDto[] = resolved.map(
            (segment) => ({
              serviceId: segment.serviceId,
              staffId: segment.staffId,
              startAt: segment.startAt.toISOString(),
              endAt: segment.endAt.toISOString(),
            }),
          );

          slots.push({
            startAt: slotStart.toUTC().toISO()!,
            endAt: chainEnd.toUTC().toISO()!,
            label: formatSlotLabel(slotStart),
            available: true,
            staffId: resolved[0]?.staffId,
            serviceLines,
          });
        }
      }

      if (
        slots.length > 0 ||
        (params.settings.waitlistEnabled && dayIsOpen)
      ) {
        days.push({ date: dateKey, slots });
      }

      cursor = cursor.plus({ days: 1 }).startOf('day');
    }

    return days;
  }

  async isChainedSlotAvailable(params: {
    settings: BusinessBookingContext;
    businessHours: BusinessHours[];
    businessExceptions: BusinessHourException[];
    chain: ChainedBookingLineInput[];
    startAt: Date;
    gapPolicy?: ReturnType<typeof resolveGapAvoidancePolicy>;
    allowMultipleServices?: boolean;
  }): Promise<ResolvedChainedSegment[] | null> {
    if (params.chain.length === 0) return null;

    const businessTz = resolveBookingTimezone(
      params.settings.timezone,
      params.settings.business.timezone,
    );
    const start = DateTime.fromJSDate(params.startAt, { zone: 'utc' }).setZone(
      businessTz,
    );
    const now = DateTime.now().setZone(businessTz);

    if (start < now.plus({ minutes: params.settings.minimumNoticeMinutes })) {
      return null;
    }
    if (
      start >
      now.plus({ days: params.settings.maxBookingDays }).endOf('day')
    ) {
      return null;
    }

    const weeklyHours = resolveEffectiveWeeklyHours(
      params.businessHours,
      undefined,
    );
    const dayOfWeek = LUXON_WEEKDAY_TO_DAY[start.weekday];
    const weekly = weeklyHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!weekly?.isEnabled) return null;

    const exceptions = this.mergeExceptions(
      params.businessExceptions,
      undefined,
      businessTz,
    );
    const dateKey = start.toISODate()!;
    const exception = exceptions.get(dateKey);
    if (this.isDayFullyBlocked(exception)) return null;

    const windowStart = parseTimeToMinutes(weekly.startTime);
    const windowEnd = parseTimeToMinutes(weekly.endTime);
    const totalOccupancy = sumChainOccupancy(params.chain);
    const startMin = start.hour * 60 + start.minute;
    if (startMin < windowStart || startMin + totalOccupancy > windowEnd) {
      return null;
    }

    const blockedRanges = this.getBlockedRangesForDay(
      exception,
      windowStart,
      windowEnd,
    );
    if (
      this.isMinutesBlocked(startMin, startMin + totalOccupancy, blockedRanges)
    ) {
      return null;
    }

    const dayStartUtc = start.startOf('day').toUTC().toJSDate();
    const dayEndUtc = start.endOf('day').toUTC().toJSDate();
    const appointments: BlockingAppointment[] =
      await this.appointmentRepository.findBlockingInRangeForStaff(
        params.settings.businessId,
        dayStartUtc,
        dayEndUtc,
      );
    const dayAppts = appointmentsOverlappingDay(
      appointments,
      dayStartUtc,
      dayEndUtc,
    );

    const firstTiming = params.chain[0]?.timing;
    const interval = resolvePublicBookingSlotStep(
      totalOccupancy,
      params.settings.slotIntervalMinutes,
    );
    const gapPolicy =
      params.gapPolicy ??
      resolveGapAvoidancePolicy({
        avoidGapsEnabled: false,
      });

    const scheduling = await this.getChainedSchedulingContext(
      params.settings.businessId,
      params.settings,
    );

    return validateChainedStart({
      chainStart: start,
      chain: params.chain,
      windowStartMin: windowStart,
      windowEndMin: windowEnd,
      slotIntervalMin: interval,
      appointments,
      dayAppointments: dayAppts,
      tz: businessTz,
      gapPolicy,
      allowMultipleServices: params.allowMultipleServices,
      scheduling,
    });
  }

  async isSlotAvailable(params: {
    settings: BusinessBookingContext;
    businessHours: BusinessHours[];
    businessExceptions: BusinessHourException[];
    staffSchedules?: StaffWorkSchedule[];
    staffExceptions?: StaffWorkException[];
    startAt: Date;
    endAt: Date;
    staffId?: string;
    eligibleStaffIds?: string[];
    timing?: PublicBookingTimingContext | null;
    gapPolicy?: ReturnType<typeof resolveGapAvoidancePolicy>;
    allowMultipleServices?: boolean;
    secondaryStaffId?: string;
  }): Promise<boolean> {
    const businessTz = resolveBookingTimezone(
      params.settings.timezone,
      params.settings.business.timezone,
    );
    const start = DateTime.fromJSDate(params.startAt, { zone: 'utc' }).setZone(
      businessTz,
    );
    const end = DateTime.fromJSDate(params.endAt, { zone: 'utc' }).setZone(
      businessTz,
    );
    const now = DateTime.now().setZone(businessTz);

    if (end <= start) return false;
    if (start < now.plus({ minutes: params.settings.minimumNoticeMinutes })) {
      return false;
    }
    if (
      start > now.plus({ days: params.settings.maxBookingDays }).endOf('day')
    ) {
      return false;
    }

    const weeklyHours = resolveEffectiveWeeklyHours(
      params.businessHours,
      params.staffSchedules?.length ? params.staffSchedules : undefined,
    );
    const dayOfWeek = LUXON_WEEKDAY_TO_DAY[start.weekday];
    const weekly = weeklyHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!weekly?.isEnabled) return false;

    const exceptions = this.mergeExceptions(
      params.businessExceptions,
      params.staffExceptions,
      businessTz,
    );
    const dateKey = start.toISODate()!;
    const exception = exceptions.get(dateKey);
    if (this.isDayFullyBlocked(exception)) return false;

    const windowStart = parseTimeToMinutes(weekly.startTime);
    const windowEnd = parseTimeToMinutes(weekly.endTime);
    const startMin = start.hour * 60 + start.minute;
    const endMin = end.hour * 60 + end.minute;

    const { bufferBeforeMinutes: bufferBefore, bufferAfterMinutes: bufferAfter } =
      await this.resolveBufferMinutes({
        businessId: params.settings.businessId,
        settings: params.settings,
        timing: params.timing,
      });
    const clientOccupancy =
      params.timing?.clientOccupancyMinutes ?? endMin - startMin;
    const duration =
      params.timing?.slotDurationMinutes ??
      clientOccupancy + bufferBefore + bufferAfter;
    const interval = resolvePublicBookingSlotStep(
      duration,
      params.settings.slotIntervalMinutes,
    );
    const fallbackBuffers = {
      bufferBeforeMinutes: bufferBefore,
      bufferAfterMinutes: bufferAfter,
    };
    const gapPolicy =
      params.gapPolicy ??
      resolveGapAvoidancePolicy({
        avoidGapsEnabled: false,
      });

    if (startMin < windowStart || endMin > windowEnd) return false;

    const blockedRanges = this.getBlockedRangesForDay(
      exception,
      windowStart,
      windowEnd,
    );
    if (this.isMinutesBlocked(startMin, endMin, blockedRanges)) return false;

    const dayStart = start.startOf('day');
    const dayEnd = start.endOf('day');
    const dayStartUtc = dayStart.toUTC().toJSDate();
    const dayEndUtc = dayEnd.toUTC().toJSDate();
    const appointments: BlockingAppointment[] =
      await this.appointmentRepository.findBlockingInRangeForStaff(
        params.settings.businessId,
        dayStartUtc,
        dayEndUtc,
      );

    const dayAppts = appointmentsOverlappingDay(
      appointments,
      dayStartUtc,
      dayEndUtc,
    );

    if (params.staffId) {
      if (
        this.countClientOccupancyOverlapping(
          staffAppointments(appointments, params.staffId),
          params.startAt,
          params.endAt,
        ) > 0
      ) {
        return false;
      }

      const staffIds = [params.staffId];
      if (params.secondaryStaffId) {
        staffIds.push(params.secondaryStaffId);
      }

      return slotPassesGapAvoidanceForStaffIds({
        slotStartMin: startMin,
        slotEndMin: endMin,
        shiftStartMin: windowStart,
        shiftEndMin: windowEnd,
        slotDurationMin: clientOccupancy,
        slotIntervalMin: interval,
        staffIds,
        appointments: dayAppts,
        tz: businessTz,
        fallbackBuffers,
        policy: gapPolicy,
        allowMultipleServices: params.allowMultipleServices,
      });
    }

    if (params.eligibleStaffIds?.length) {
      return params.eligibleStaffIds.some((staffId) => {
        if (
          this.countClientOccupancyOverlapping(
            staffAppointments(appointments, staffId),
            params.startAt,
            params.endAt,
          ) > 0
        ) {
          return false;
        }

        return slotPassesGapAvoidanceForStaffIds({
          slotStartMin: startMin,
          slotEndMin: endMin,
          shiftStartMin: windowStart,
          shiftEndMin: windowEnd,
          slotDurationMin: clientOccupancy,
          slotIntervalMin: interval,
          staffIds: [staffId],
          appointments: dayAppts,
          tz: businessTz,
          fallbackBuffers,
          policy: gapPolicy,
          allowMultipleServices: params.allowMultipleServices,
        });
      });
    }

    return false;
  }

  private mergeExceptions(
    businessExceptions: BusinessHourException[],
    staffExceptions: StaffWorkException[] | undefined,
    _tz: string,
  ): Map<string, DayException> {
    const map = new Map<string, DayException>();
    for (const e of businessExceptions) {
      const key = parseCalendarDateKey(e.date);
      map.set(key, e);
    }
    for (const e of staffExceptions ?? []) {
      const key = parseCalendarDateKey(e.date);
      map.set(key, e);
    }
    return map;
  }

  private isDayFullyBlocked(exception?: DayException): boolean {
    if (!exception?.isUnavailable) return false;
    return !exception.startTime && !exception.endTime;
  }

  private getBlockedRangesForDay(
    exception: DayException | undefined,
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

  private countClientOccupancyOverlapping(
    appointments: Array<{
      startAt: Date;
      endAt: Date;
    }>,
    slotStart: Date,
    slotEnd: Date,
  ): number {
    return countClientOccupancyOverlaps(appointments, {
      startAt: slotStart,
      endAt: slotEnd,
    });
  }
}
