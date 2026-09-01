export const DEFAULT_REBOOKING_JUMP_WEEKS = [2, 3, 4, 5, 6, 7] as const;

export function parseRebookingJumpWeeks(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_REBOOKING_JUMP_WEEKS];
  }
  const parsed = raw
    .filter((value): value is number => typeof value === 'number' && Number.isInteger(value))
    .filter((value) => value >= 1 && value <= 12);
  const unique = [...new Set(parsed)].sort((a, b) => a - b);
  if (unique.length === 0) {
    return [...DEFAULT_REBOOKING_JUMP_WEEKS];
  }
  return unique.slice(0, 8);
}

export function assertValidRebookingJumpWeeks(weeks: number[]): void {
  if (weeks.length === 0 || weeks.length > 8) {
    throw new Error('Select between 1 and 8 rebooking jump intervals');
  }
  for (const week of weeks) {
    if (!Number.isInteger(week) || week < 1 || week > 12) {
      throw new Error('Each rebooking jump must be an integer from 1 to 12 weeks');
    }
  }
}

export type SchedulingFeatureFlags = {
  bufferTimeEnabled: boolean;
  processingTimeEnabled: boolean;
};

export type BufferFallback = {
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

export function resolveEffectiveBuffers(params: {
  bufferTimeEnabled: boolean;
  timing?: {
    hasBufferTime: boolean;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  } | null;
  businessFallback: BufferFallback;
  calendarFallback?: BufferFallback;
  preferCalendarFallback?: boolean;
}): { bufferBeforeMinutes: number; bufferAfterMinutes: number } {
  if (!params.bufferTimeEnabled) {
    return { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 };
  }
  if (params.timing?.hasBufferTime) {
    return {
      bufferBeforeMinutes: params.timing.bufferBeforeMinutes,
      bufferAfterMinutes: params.timing.bufferAfterMinutes,
    };
  }
  if (params.preferCalendarFallback && params.calendarFallback) {
    return {
      bufferBeforeMinutes: params.calendarFallback.bufferBeforeMinutes,
      bufferAfterMinutes: params.calendarFallback.bufferAfterMinutes,
    };
  }
  return {
    bufferBeforeMinutes: params.businessFallback.bufferBeforeMinutes,
    bufferAfterMinutes: params.businessFallback.bufferAfterMinutes,
  };
}

export function applyProcessingFeatureFlag<
  T extends { hasProcessingTime: boolean; processingDurationMinutes: number; finishDurationMinutes: number | null },
>(timing: T, processingTimeEnabled: boolean): T {
  if (processingTimeEnabled) {
    return timing;
  }
  return {
    ...timing,
    hasProcessingTime: false,
    processingDurationMinutes: 0,
    finishDurationMinutes: 0,
  };
}
