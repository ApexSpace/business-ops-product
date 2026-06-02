import type { Appointment } from "@/lib/appointment-profile";
import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_EVENT_MIN_HEIGHT_PX,
  CALENDAR_SLOT_HEIGHT_PX,
  CALENDAR_SLOT_MINUTES,
  calculateEventPosition,
} from "@/lib/calendar-dates";

export const OVERLAP_LAYOUT_GAP_PX = 2;
/** Preview appointment width when "+ N more" is shown beside it */
export const OVERLAP_PREVIEW_WIDTH_PERCENT = 68;
/** "+ N more" chip width (same row as preview) */
export const OVERLAP_MORE_WIDTH_PERCENT = 32;

export type TimedAppointment = Pick<Appointment, "id" | "startAt" | "endAt">;

function instant(iso: string): number {
  return new Date(iso).getTime();
}

/** Compare UTC instants — timezone does not affect overlap. */
export function appointmentsOverlap(
  a: TimedAppointment,
  b: TimedAppointment,
): boolean {
  return instant(a.startAt) < instant(b.endAt) && instant(b.startAt) < instant(a.endAt);
}

/** Alias for overlap checks. */
export function detectAppointmentOverlaps(
  a: TimedAppointment,
  b: TimedAppointment,
): boolean {
  return appointmentsOverlap(a, b);
}

/** Connected components: each group contains mutually overlapping appointments. */
export function getOverlappingAppointmentGroups<T extends TimedAppointment>(
  appointments: T[],
): T[][] {
  if (appointments.length === 0) return [];

  const sorted = [...appointments].sort(
    (a, b) => instant(a.startAt) - instant(b.startAt),
  );
  const groups: T[][] = [];
  const assigned = new Set<string>();

  for (const apt of sorted) {
    if (assigned.has(apt.id)) continue;

    const group: T[] = [apt];
    assigned.add(apt.id);
    let grew = true;

    while (grew) {
      grew = false;
      for (const candidate of sorted) {
        if (assigned.has(candidate.id)) continue;
        if (group.some((g) => appointmentsOverlap(g, candidate))) {
          group.push(candidate);
          assigned.add(candidate.id);
          grew = true;
        }
      }
    }

    groups.push(
      group.sort((a, b) => instant(a.startAt) - instant(b.startAt)),
    );
  }

  return groups;
}

export interface TimeGridEventLayout {
  type: "event";
  appointment: Appointment;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
  columnIndex: number;
  columnCount: number;
}

export interface TimeGridMoreLayout {
  type: "more";
  appointments: Appointment[];
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
}

export type TimeGridAppointmentLayout = TimeGridEventLayout | TimeGridMoreLayout;

export interface LayoutOverlappingOptions {
  /** Fallback when resolveEventTimezone is not provided */
  timezone: string;
  /** Per-appointment TZ (calendar timezone) for stable grid position */
  resolveEventTimezone?: (appointment: Appointment) => string;
  dayStartHour?: number;
  dayEndHour?: number;
  slotMinutes?: number;
  slotHeightPx?: number;
}

function eventTimezone(
  appointment: TimedAppointment,
  opts: LayoutOverlappingOptions,
): string {
  return (
    opts.resolveEventTimezone?.(appointment as Appointment) ?? opts.timezone
  );
}

function eventPosition(appointment: TimedAppointment, opts: LayoutOverlappingOptions) {
  const timezone = eventTimezone(appointment, opts);
  return calculateEventPosition(
    appointment.startAt,
    appointment.endAt,
    opts.dayStartHour ?? CALENDAR_DAY_START_HOUR,
    opts.dayEndHour ?? CALENDAR_DAY_END_HOUR,
    opts.slotMinutes ?? CALENDAR_SLOT_MINUTES,
    opts.slotHeightPx ?? CALENDAR_SLOT_HEIGHT_PX,
    timezone,
  );
}

function sortClusterForLayout<T extends TimedAppointment>(cluster: T[]): T[] {
  return [...cluster].sort((a, b) => {
    const startDiff = instant(a.startAt) - instant(b.startAt);
    if (startDiff !== 0) return startDiff;
    return instant(b.endAt) - instant(a.endAt);
  });
}

/** Shared top/height for all items in an overlap cluster (same time slot box). */
function clusterSlotBounds(
  cluster: TimedAppointment[],
  options: LayoutOverlappingOptions,
): { top: number; height: number } {
  let top = Infinity;
  let bottom = 0;

  for (const apt of cluster) {
    const { top: aptTop, height } = eventPosition(apt, options);
    const aptHeight = Math.max(height, CALENDAR_EVENT_MIN_HEIGHT_PX);
    top = Math.min(top, aptTop);
    bottom = Math.max(bottom, aptTop + aptHeight);
  }

  return {
    top,
    height: Math.max(bottom - top, CALENDAR_EVENT_MIN_HEIGHT_PX),
  };
}

/**
 * Overlapping slot: one appointment preview + "+ N more" beside it in the same box.
 */
export function layoutOverlappingAppointments(
  appointments: Appointment[],
  options: LayoutOverlappingOptions,
): TimeGridAppointmentLayout[] {
  const clusters = getOverlappingAppointmentGroups(appointments);
  const layouts: TimeGridAppointmentLayout[] = [];

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      const apt = cluster[0] as Appointment;
      const { top, height } = eventPosition(apt, options);
      layouts.push({
        type: "event",
        appointment: apt,
        top,
        height: Math.max(height, CALENDAR_EVENT_MIN_HEIGHT_PX),
        leftPercent: 0,
        widthPercent: 100,
        columnIndex: 0,
        columnCount: 1,
      });
      continue;
    }

    const sorted = sortClusterForLayout(cluster as Appointment[]);
    const [first, ...rest] = sorted;
    const { top, height } = clusterSlotBounds(sorted, options);

    layouts.push({
      type: "event",
      appointment: first,
      top,
      height,
      leftPercent: 0,
      widthPercent: OVERLAP_PREVIEW_WIDTH_PERCENT,
      columnIndex: 0,
      columnCount: 2,
    });

    layouts.push({
      type: "more",
      appointments: rest,
      top,
      height,
      leftPercent: OVERLAP_PREVIEW_WIDTH_PERCENT,
      widthPercent: OVERLAP_MORE_WIDTH_PERCENT,
    });
  }

  return layouts;
}
