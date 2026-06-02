import {
  Calendar,
  CalendarAvailability,
  CalendarException,
  CalendarStaff,
} from '@prisma/client';
import {
  CalendarAvailabilityResponseDto,
  CalendarDetailResponseDto,
  CalendarExceptionResponseDto,
  CalendarResponseDto,
  CalendarStaffResponseDto,
} from '../dto/calendar.dto';
import { CalendarWithCounts } from '../repositories/calendar.repository';

type StaffWithUser = CalendarStaff & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

function jsonRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function baseCalendar(calendar: Calendar): CalendarResponseDto {
  return {
    id: calendar.id,
    businessId: calendar.businessId,
    name: calendar.name,
    description: calendar.description,
    type: calendar.type,
    color: calendar.color,
    timezone: calendar.timezone,
    status: calendar.status,
    defaultDurationMinutes: calendar.defaultDurationMinutes,
    bufferBeforeMinutes: calendar.bufferBeforeMinutes,
    bufferAfterMinutes: calendar.bufferAfterMinutes,
    minimumNoticeMinutes: calendar.minimumNoticeMinutes,
    maxBookingDays: calendar.maxBookingDays,
    slotIntervalMinutes: calendar.slotIntervalMinutes,
    locationType: calendar.locationType,
    locationValue: calendar.locationValue,
    requireApproval: calendar.requireApproval,
    autoConfirm: calendar.autoConfirm,
    capacity: calendar.capacity,
    formSettings: jsonRecord(calendar.formSettings),
    confirmationSettings: jsonRecord(calendar.confirmationSettings),
    paymentSettings: jsonRecord(calendar.paymentSettings),
    notificationSettings: jsonRecord(calendar.notificationSettings),
    policySettings: jsonRecord(calendar.policySettings),
    widgetSettings: jsonRecord(calendar.widgetSettings),
    googleSyncSettings: jsonRecord(calendar.googleSyncSettings),
    createdAt: calendar.createdAt,
    updatedAt: calendar.updatedAt,
  };
}

export function toCalendarResponse(
  calendar: CalendarWithCounts,
): CalendarResponseDto {
  return {
    ...baseCalendar(calendar),
    staffCount: calendar._count.staff,
    appointmentCount: calendar._count.appointments,
  };
}

export function toCalendarDetailResponse(
  calendar: Calendar & {
    staff: StaffWithUser[];
    availability: CalendarAvailability[];
    exceptions: CalendarException[];
    _count?: { staff: number; appointments: number };
  },
): CalendarDetailResponseDto {
  return {
    ...baseCalendar(calendar),
    staffCount: calendar._count?.staff ?? calendar.staff.length,
    appointmentCount: calendar._count?.appointments ?? 0,
    staff: calendar.staff.map(toCalendarStaffResponse),
    availability: calendar.availability.map(toAvailabilityResponse),
    exceptions: calendar.exceptions.map(toExceptionResponse),
  };
}

export function toCalendarStaffResponse(
  row: StaffWithUser,
): CalendarStaffResponseDto {
  return {
    id: row.id,
    calendarId: row.calendarId,
    userId: row.userId,
    role: row.role,
    isPrimary: row.isPrimary,
    user: row.user,
  };
}

export function toAvailabilityResponse(
  row: CalendarAvailability,
): CalendarAvailabilityResponseDto {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    isEnabled: row.isEnabled,
  };
}

export function toExceptionResponse(
  row: CalendarException,
): CalendarExceptionResponseDto {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    isUnavailable: row.isUnavailable,
    reason: row.reason,
  };
}
