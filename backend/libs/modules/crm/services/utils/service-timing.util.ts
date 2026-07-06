export type ServiceTimingSegmentType = 'ACTIVE' | 'PROCESSING';

export type ServiceTimingSegment = {
  type: ServiceTimingSegmentType;
  minutes: number;
};

export type ServiceTimingFields = {
  durationMinutes: number;
  hasProcessingTime: boolean;
  processingDurationMinutes: number;
  finishDurationMinutes: number | null;
  hasBufferTime: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

export type ResolvedServiceTiming = ServiceTimingFields & {
  clientOccupancyMinutes: number;
  staffBlockedMinutes: number;
  segments: ServiceTimingSegment[];
};

export function resolveServiceTiming(
  input: ServiceTimingFields,
  calendarBuffers?: { bufferBeforeMinutes: number; bufferAfterMinutes: number },
): ResolvedServiceTiming {
  const finish = input.finishDurationMinutes ?? 0;
  const clientOccupancyMinutes =
    input.durationMinutes +
    (input.hasProcessingTime ? input.processingDurationMinutes : 0) +
    finish;

  const bufferBefore = input.hasBufferTime
    ? input.bufferBeforeMinutes
    : (calendarBuffers?.bufferBeforeMinutes ?? 0);
  const bufferAfter = input.hasBufferTime
    ? input.bufferAfterMinutes
    : (calendarBuffers?.bufferAfterMinutes ?? 0);

  const staffBlockedMinutes =
    input.durationMinutes + finish + bufferBefore + bufferAfter;

  const segments: ServiceTimingSegment[] = [
    { type: 'ACTIVE', minutes: input.durationMinutes },
  ];
  if (input.hasProcessingTime && input.processingDurationMinutes > 0) {
    segments.push({
      type: 'PROCESSING',
      minutes: input.processingDurationMinutes,
    });
  }
  if (finish > 0) {
    segments.push({ type: 'ACTIVE', minutes: finish });
  }

  return {
    ...input,
    clientOccupancyMinutes,
    staffBlockedMinutes,
    segments,
  };
}

export function mergeStaffTimingOverrides(
  service: ServiceTimingFields,
  staff: Partial<ServiceTimingFields> | null | undefined,
): ServiceTimingFields {
  if (!staff) {
    return service;
  }
  return {
    durationMinutes: staff.durationMinutes ?? service.durationMinutes,
    hasProcessingTime: staff.hasProcessingTime ?? service.hasProcessingTime,
    processingDurationMinutes:
      staff.processingDurationMinutes ?? service.processingDurationMinutes,
    finishDurationMinutes:
      staff.finishDurationMinutes !== undefined
        ? staff.finishDurationMinutes
        : service.finishDurationMinutes,
    hasBufferTime: staff.hasBufferTime ?? service.hasBufferTime,
    bufferBeforeMinutes:
      staff.bufferBeforeMinutes ?? service.bufferBeforeMinutes,
    bufferAfterMinutes: staff.bufferAfterMinutes ?? service.bufferAfterMinutes,
  };
}
