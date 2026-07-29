import { DateTime } from 'luxon';
import {
  GapEmptyDayMode,
  GapMultiProviderMode,
  GapTimeBlockMode,
} from '@prisma/client';

export type GapScheduleEvent = {
  startMin: number;
  endMin: number;
  isTimeBlock: boolean;
};

export type GapAvoidancePolicy = {
  enabled: boolean;
  maxGapMinutes: number | null;
  minGapMinutes: number | null;
  timeBlockMode: GapTimeBlockMode;
  emptyDayMode: GapEmptyDayMode;
  multiProviderMode: GapMultiProviderMode;
};

type TimingBuffers = {
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

export function isTimeBlockMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as Record<string, unknown>).kind === 'TIME_BLOCK';
}

export function resolveGapAvoidancePolicy(settings: {
  avoidGapsEnabled: boolean;
  avoidGapsMaxGapMinutes?: number | null;
  avoidGapsMinGapMinutes?: number | null;
  avoidGapsTimeBlockMode?: GapTimeBlockMode;
  avoidGapsEmptyDayMode?: GapEmptyDayMode;
  avoidGapsMultiProviderMode?: GapMultiProviderMode;
}): GapAvoidancePolicy {
  return {
    enabled: settings.avoidGapsEnabled,
    maxGapMinutes: settings.avoidGapsEnabled
      ? (settings.avoidGapsMaxGapMinutes ?? null)
      : null,
    minGapMinutes: settings.avoidGapsMinGapMinutes ?? null,
    timeBlockMode:
      settings.avoidGapsTimeBlockMode ?? GapTimeBlockMode.SAME_AS_APPOINTMENTS,
    emptyDayMode: settings.avoidGapsEmptyDayMode ?? GapEmptyDayMode.ALL_TIMES,
    multiProviderMode:
      settings.avoidGapsMultiProviderMode ??
      GapMultiProviderMode.SAME_AS_SINGLE,
  };
}

export function toGapScheduleEvents(
  appointments: Array<{
    startAt: Date;
    endAt: Date;
    metadata?: unknown;
  }>,
  tz: string,
  _fallbackBuffers: TimingBuffers,
): GapScheduleEvent[] {
  return appointments.map((apt) => {
    const start = DateTime.fromJSDate(apt.startAt, { zone: 'utc' }).setZone(tz);
    const end = DateTime.fromJSDate(apt.endAt, { zone: 'utc' }).setZone(tz);
    return {
      startMin: start.hour * 60 + start.minute,
      endMin: end.hour * 60 + end.minute,
      isTimeBlock: isTimeBlockMetadata(apt.metadata),
    };
  });
}

export function computeShiftEdgeSlotStarts(params: {
  shiftStartMin: number;
  shiftEndMin: number;
  slotDurationMin: number;
  slotIntervalMin: number;
}): { firstStartMin: number; lastStartMin: number } {
  const { shiftStartMin, shiftEndMin, slotDurationMin, slotIntervalMin } =
    params;
  let lastStartMin = shiftStartMin;
  for (
    let startMin = shiftStartMin;
    startMin + slotDurationMin <= shiftEndMin;
    startMin += slotIntervalMin
  ) {
    lastStartMin = startMin;
  }
  return { firstStartMin: shiftStartMin, lastStartMin };
}

export function isShiftEdgeSlot(params: {
  slotStartMin: number;
  shiftStartMin: number;
  shiftEndMin: number;
  slotDurationMin: number;
  slotIntervalMin: number;
}): boolean {
  const edges = computeShiftEdgeSlotStarts({
    shiftStartMin: params.shiftStartMin,
    shiftEndMin: params.shiftEndMin,
    slotDurationMin: params.slotDurationMin,
    slotIntervalMin: params.slotIntervalMin,
  });
  return (
    params.slotStartMin === edges.firstStartMin ||
    params.slotStartMin === edges.lastStartMin
  );
}

function filterEventsWithinShift(
  events: GapScheduleEvent[],
  shiftStartMin: number,
  shiftEndMin: number,
): GapScheduleEvent[] {
  return events.filter(
    (event) => event.startMin < shiftEndMin && event.endMin > shiftStartMin,
  );
}

function buildGapAnchors(
  events: GapScheduleEvent[],
  timeBlockMode: GapTimeBlockMode,
  shiftStartMin: number,
  shiftEndMin: number,
): Array<{ startMin: number; endMin: number }> {
  return filterEventsWithinShift(events, shiftStartMin, shiftEndMin)
    .filter(
      (event) =>
        !event.isTimeBlock ||
        timeBlockMode === GapTimeBlockMode.SAME_AS_APPOINTMENTS,
    )
    .map(({ startMin, endMin }) => ({ startMin, endMin }));
}

function isAdjacentToIgnoredTimeBlock(params: {
  slotStartMin: number;
  slotEndMin: number;
  shiftStartMin: number;
  shiftEndMin: number;
  events: GapScheduleEvent[];
  timeBlockMode: GapTimeBlockMode;
}): boolean {
  if (params.timeBlockMode !== GapTimeBlockMode.IGNORE) return false;
  return filterEventsWithinShift(
    params.events,
    params.shiftStartMin,
    params.shiftEndMin,
  ).some(
    (event) =>
      event.isTimeBlock &&
      (params.slotEndMin === event.startMin ||
        params.slotStartMin === event.endMin),
  );
}

export function slotPassesGapAvoidance(params: {
  slotStartMin: number;
  slotEndMin: number;
  shiftStartMin: number;
  shiftEndMin: number;
  slotDurationMin: number;
  slotIntervalMin: number;
  events: GapScheduleEvent[];
  policy: GapAvoidancePolicy;
}): boolean {
  const { policy } = params;
  if (!policy.enabled) return true;

  if (
    isAdjacentToIgnoredTimeBlock({
      slotStartMin: params.slotStartMin,
      slotEndMin: params.slotEndMin,
      shiftStartMin: params.shiftStartMin,
      shiftEndMin: params.shiftEndMin,
      events: params.events,
      timeBlockMode: policy.timeBlockMode,
    })
  ) {
    return false;
  }

  const gapAnchors = buildGapAnchors(
    params.events,
    policy.timeBlockMode,
    params.shiftStartMin,
    params.shiftEndMin,
  );

  if (gapAnchors.length === 0) {
    if (policy.emptyDayMode === GapEmptyDayMode.ALL_TIMES) {
      return true;
    }
    return isShiftEdgeSlot({
      slotStartMin: params.slotStartMin,
      shiftStartMin: params.shiftStartMin,
      shiftEndMin: params.shiftEndMin,
      slotDurationMin: params.slotDurationMin,
      slotIntervalMin: params.slotIntervalMin,
    });
  }

  const prev = gapAnchors
    .filter((anchor) => anchor.endMin <= params.slotStartMin)
    .sort((a, b) => b.endMin - a.endMin)[0];
  const next = gapAnchors
    .filter((anchor) => anchor.startMin >= params.slotEndMin)
    .sort((a, b) => a.startMin - b.startMin)[0];

  const gapBefore = prev ? params.slotStartMin - prev.endMin : null;
  const gapAfter = next ? next.startMin - params.slotEndMin : null;
  const isAdjacent = gapBefore === 0 || gapAfter === 0;

  if (policy.maxGapMinutes === 0) {
    return isAdjacent;
  }

  if (policy.maxGapMinutes !== null) {
    if (
      gapBefore !== null &&
      gapBefore > 0 &&
      gapBefore > policy.maxGapMinutes
    ) {
      return false;
    }
    if (gapAfter !== null && gapAfter > 0 && gapAfter > policy.maxGapMinutes) {
      return false;
    }
  }

  if (policy.minGapMinutes !== null) {
    if (
      gapBefore !== null &&
      gapBefore > 0 &&
      gapBefore < policy.minGapMinutes
    ) {
      return false;
    }
    if (gapAfter !== null && gapAfter > 0 && gapAfter < policy.minGapMinutes) {
      return false;
    }
  }

  return true;
}

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

export function slotPassesGapAvoidanceForStaffIds(params: {
  slotStartMin: number;
  slotEndMin: number;
  shiftStartMin: number;
  shiftEndMin: number;
  slotDurationMin: number;
  slotIntervalMin: number;
  staffIds: string[];
  appointments: Array<{
    assignedToId: string | null;
    startAt: Date;
    endAt: Date;
    metadata?: unknown;
    serviceLines?: Array<{ assignedToId: string | null }>;
  }>;
  tz: string;
  fallbackBuffers: TimingBuffers;
  policy: GapAvoidancePolicy;
  allowMultipleServices?: boolean;
}): boolean {
  if (!params.policy.enabled) return true;
  if (
    params.allowMultipleServices &&
    params.policy.multiProviderMode === GapMultiProviderMode.ALLOW_GAPS
  ) {
    return true;
  }

  return params.staffIds.every((staffId) =>
    slotPassesGapAvoidance({
      slotStartMin: params.slotStartMin,
      slotEndMin: params.slotEndMin,
      shiftStartMin: params.shiftStartMin,
      shiftEndMin: params.shiftEndMin,
      slotDurationMin: params.slotDurationMin,
      slotIntervalMin: params.slotIntervalMin,
      events: toGapScheduleEvents(
        params.appointments.filter((apt) =>
          appointmentAssignedToStaff(apt, staffId),
        ),
        params.tz,
        params.fallbackBuffers,
      ),
      policy: params.policy,
    }),
  );
}
