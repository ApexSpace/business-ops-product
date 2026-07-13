import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_EVENT_MIN_HEIGHT_PX,
  CALENDAR_SLOT_HEIGHT_PX,
  CALENDAR_SLOT_MINUTES,
  calculateEventPosition,
} from "@/features/calendars/utils/calendar-dates";

export const OVERLAP_LAYOUT_GAP_PX = 2;
/** Mangomint-style: bars use this share of the column; the rest stays clickable. */
export const OVERLAP_BARS_MAX_WIDTH_PERCENT = 78;

export type TimedAppointment = Pick<Appointment, "id" | "startAt" | "endAt">;

function instant(iso: string): number {
  return new Date(iso).getTime();
}

export function appointmentsOverlap(
  a: TimedAppointment,
  b: TimedAppointment,
): boolean {
  return instant(a.startAt) < instant(b.endAt) && instant(b.startAt) < instant(a.endAt);
}

export function detectAppointmentOverlaps(
  a: TimedAppointment,
  b: TimedAppointment,
): boolean {
  return appointmentsOverlap(a, b);
}

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
  timezone: string;
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

/** Greedy column assignment: each bar only shares a column with non-overlapping events. */
function assignOverlapColumns<T extends TimedAppointment>(
  cluster: T[],
): Map<string, number> {
  const sorted = [...cluster].sort(
    (a, b) => instant(a.startAt) - instant(b.startAt),
  );
  const columns: T[][] = [];
  const placement = new Map<string, number>();

  for (const apt of sorted) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const overlapsColumn = columns[col].some((existing) =>
        appointmentsOverlap(existing, apt),
      );
      if (!overlapsColumn) {
        columns[col].push(apt);
        placement.set(apt.id, col);
        placed = true;
        break;
      }
    }
    if (!placed) {
      placement.set(apt.id, columns.length);
      columns.push([apt]);
    }
  }

  return placement;
}

/**
 * Mangomint-style: each appointment is a narrow vertical bar at its true start/end.
 * Concurrent overlaps render side-by-side; empty space on the right stays clickable.
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
        widthPercent: OVERLAP_BARS_MAX_WIDTH_PERCENT,
        columnIndex: 0,
        columnCount: 1,
      });
      continue;
    }

    const sorted = [...cluster].sort(
      (a, b) => instant(a.startAt) - instant(b.startAt),
    ) as Appointment[];
    const placement = assignOverlapColumns(sorted);
    const columnCount =
      Math.max(...Array.from(placement.values()), 0) + 1;
    const barWidth = OVERLAP_BARS_MAX_WIDTH_PERCENT / columnCount;

    for (const apt of sorted) {
      const columnIndex = placement.get(apt.id) ?? 0;
      const { top, height } = eventPosition(apt, options);
      layouts.push({
        type: "event",
        appointment: apt,
        top,
        height: Math.max(height, CALENDAR_EVENT_MIN_HEIGHT_PX),
        leftPercent: columnIndex * barWidth,
        widthPercent: barWidth,
        columnIndex,
        columnCount,
      });
    }
  }

  return layouts;
}
