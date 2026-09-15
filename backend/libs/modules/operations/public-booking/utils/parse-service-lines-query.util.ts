import type { PublicBookingServiceLineDto } from '../dto/public-booking.dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function toServiceLine(value: unknown): PublicBookingServiceLineDto | null {
  if (!isRecord(value)) return null;
  if (typeof value.serviceId !== 'string') return null;
  return {
    serviceId: value.serviceId,
    staffId: typeof value.staffId === 'string' ? value.staffId : undefined,
  };
}

export function normalizeServiceLinesValue(
  value: unknown,
): PublicBookingServiceLineDto[] | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    const lines = value
      .map((entry) => toServiceLine(entry))
      .filter((entry): entry is PublicBookingServiceLineDto => entry != null);
    return lines.length > 0 ? lines : undefined;
  }

  if (typeof value === 'string') {
    try {
      return normalizeServiceLinesValue(JSON.parse(value) as unknown);
    } catch {
      return undefined;
    }
  }

  if (isRecord(value)) {
    const numericKeys = Object.keys(value).filter((key) => /^\d+$/.test(key));
    if (numericKeys.length > 0) {
      const lines = numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => toServiceLine(value[key]))
        .filter((entry): entry is PublicBookingServiceLineDto => entry != null);
      return lines.length > 0 ? lines : undefined;
    }

    const single = toServiceLine(value);
    return single ? [single] : undefined;
  }

  return undefined;
}

export function parseServiceLinesFromHttpQuery(
  query: Record<string, unknown>,
): PublicBookingServiceLineDto[] | undefined {
  return normalizeServiceLinesValue(query.serviceLines);
}

/** @deprecated Use normalizeServiceLinesValue */
export function parseServiceLinesQueryValue(
  value: unknown,
): PublicBookingServiceLineDto[] | undefined {
  return normalizeServiceLinesValue(value);
}
