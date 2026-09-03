import {
  AppointmentSource,
  AppointmentStatus,
  SelfCancellationMode,
  SelfRescheduleMode,
} from '@prisma/client';

export const HOURS_BEFORE_OPTIONS = [1, 2, 4, 6, 12, 24, 48, 72] as const;
export type HoursBeforeOption = (typeof HOURS_BEFORE_OPTIONS)[number];

export const DEFAULT_ONLINE_BOOKING_GRACE_MINUTES = 15;
export const DEFAULT_LATE_CANCELLATION_HOURS = 24;

export interface CancelRescheduleBehaviorSettings {
  selfCancellationMode: SelfCancellationMode;
  selfCancellationMinutes: number;
  selfCancellationHoursBefore: number;
  selfRescheduleMode: SelfRescheduleMode;
  selfRescheduleHoursBefore: number;
  lateCancellationHoursBefore: number;
}

export interface ClientManageAppointmentContext {
  status: AppointmentStatus;
  source: AppointmentSource;
  startAt: Date;
  bookedAt: Date | null;
  createdAt: Date;
}

export function assertValidHoursBefore(value: number): void {
  if (!HOURS_BEFORE_OPTIONS.includes(value as HoursBeforeOption)) {
    throw new Error(
      `Hours before must be one of: ${HOURS_BEFORE_OPTIONS.join(', ')}`,
    );
  }
}

export function assertValidGraceMinutes(value: number): void {
  if (value < 5 || value > 60) {
    throw new Error('Grace minutes must be between 5 and 60');
  }
}

export function hoursBeforeAppointmentStart(
  startAt: Date,
  now: Date,
): number {
  return (startAt.getTime() - now.getTime()) / 3_600_000;
}

export function isOnlineBookingSource(source: AppointmentSource): boolean {
  return (
    source === AppointmentSource.BOOKING_WIDGET ||
    source === AppointmentSource.PUBLIC_LINK
  );
}

export function canClientCancel(
  settings: CancelRescheduleBehaviorSettings,
  appointment: ClientManageAppointmentContext,
  now = new Date(),
): boolean {
  if (
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.NO_SHOW ||
    appointment.status === AppointmentStatus.PENDING_COMPLETION
  ) {
    return false;
  }

  if (settings.selfCancellationMode === SelfCancellationMode.DISABLED) {
    return false;
  }

  if (
    settings.selfCancellationMode ===
    SelfCancellationMode.WITHIN_MINUTES_OF_ONLINE_BOOKING
  ) {
    if (!isOnlineBookingSource(appointment.source)) {
      return false;
    }
    const bookedAt = appointment.bookedAt ?? appointment.createdAt;
    const graceEnd = bookedAt.getTime() + settings.selfCancellationMinutes * 60_000;
    return now.getTime() <= graceEnd;
  }

  const hoursBefore = hoursBeforeAppointmentStart(appointment.startAt, now);
  return hoursBefore >= settings.selfCancellationHoursBefore;
}

export function canClientReschedule(
  settings: CancelRescheduleBehaviorSettings,
  appointment: ClientManageAppointmentContext,
  now = new Date(),
): boolean {
  if (
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.NO_SHOW ||
    appointment.status === AppointmentStatus.PENDING_COMPLETION ||
    appointment.status === AppointmentStatus.IN_SERVICE ||
    appointment.status === AppointmentStatus.WAITING
  ) {
    return false;
  }

  if (settings.selfRescheduleMode === SelfRescheduleMode.DISABLED) {
    return false;
  }

  const hoursBefore = hoursBeforeAppointmentStart(appointment.startAt, now);
  return hoursBefore >= settings.selfRescheduleHoursBefore;
}

export function classifyStaffCancellation(
  settings: CancelRescheduleBehaviorSettings,
  appointment: { startAt: Date },
  canceledAt: Date,
): 'late' | 'normal' {
  const hoursBefore = hoursBeforeAppointmentStart(appointment.startAt, canceledAt);
  if (hoursBefore >= 0 && hoursBefore <= settings.lateCancellationHoursBefore) {
    return 'late';
  }
  return 'normal';
}

export function stripHtmlToPlainText(html: string | null | undefined): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
