import { resolveBusinessTimezone } from '@app/common/utils/timezone.util';

/** Scheduling always uses the business profile timezone. */
export function resolveBookingTimezone(
  _settingsTimezone: string | null | undefined,
  businessTimezone: string | null | undefined,
): string {
  return resolveBusinessTimezone(businessTimezone);
}
