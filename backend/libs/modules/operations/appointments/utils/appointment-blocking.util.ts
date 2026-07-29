export type AppointmentBlockingWindow = {
  blockStart: Date;
  blockEnd: Date;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

type BlockingAppointment = {
  startAt: Date;
  endAt: Date;
  metadata?: unknown;
};

type StoredTimingBuffers = {
  hasServiceTiming: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

function readTimingBuffers(metadata: unknown): StoredTimingBuffers {
  if (!metadata || typeof metadata !== 'object') {
    return {
      hasServiceTiming: false,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    };
  }
  const timing = (metadata as Record<string, unknown>).serviceTiming;
  if (!timing || typeof timing !== 'object') {
    return {
      hasServiceTiming: false,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    };
  }
  const row = timing as Record<string, unknown>;
  return {
    hasServiceTiming: true,
    bufferBeforeMinutes: Math.max(0, Number(row.bufferBeforeMinutes ?? 0) || 0),
    bufferAfterMinutes: Math.max(0, Number(row.bufferAfterMinutes ?? 0) || 0),
  };
}

export function resolveAppointmentBlockingWindow(
  appointment: BlockingAppointment,
  fallbackBuffers?: { bufferBeforeMinutes: number; bufferAfterMinutes: number },
): AppointmentBlockingWindow {
  const fromMetadata = readTimingBuffers(appointment.metadata);
  const bufferBefore = fromMetadata.hasServiceTiming
    ? fromMetadata.bufferBeforeMinutes
    : (fallbackBuffers?.bufferBeforeMinutes ?? 0);
  const bufferAfter = fromMetadata.hasServiceTiming
    ? fromMetadata.bufferAfterMinutes
    : (fallbackBuffers?.bufferAfterMinutes ?? 0);

  return {
    bufferBeforeMinutes: bufferBefore,
    bufferAfterMinutes: bufferAfter,
    blockStart: new Date(appointment.startAt.getTime() - bufferBefore * 60_000),
    blockEnd: new Date(appointment.endAt.getTime() + bufferAfter * 60_000),
  };
}

export function appointmentBlocksOverlap(
  a: AppointmentBlockingWindow,
  b: AppointmentBlockingWindow,
): boolean {
  return a.blockStart < b.blockEnd && b.blockStart < a.blockEnd;
}

/** Client-visible occupancy only — used for public booking slot overlap. */
export function appointmentClientOccupancyOverlaps(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date },
): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

export function countClientOccupancyOverlaps(
  appointments: BlockingAppointment[],
  candidate: { startAt: Date; endAt: Date },
): number {
  return appointments.filter((apt) =>
    appointmentClientOccupancyOverlaps(apt, candidate),
  ).length;
}

export function countStaffBlockingOverlaps(
  appointments: BlockingAppointment[],
  candidate: AppointmentBlockingWindow,
  fallbackBuffers?: { bufferBeforeMinutes: number; bufferAfterMinutes: number },
): number {
  return appointments.filter((apt) =>
    appointmentBlocksOverlap(
      resolveAppointmentBlockingWindow(apt, fallbackBuffers),
      candidate,
    ),
  ).length;
}
