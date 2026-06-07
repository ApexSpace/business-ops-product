import { DateTime } from 'luxon';

export function formatContactName(contact: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
}): string {
  return (
    contact.displayName?.trim() ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    contact.companyName?.trim() ||
    contact.email?.trim() ||
    'Customer'
  );
}

export function formatUserName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    'A team member'
  );
}

export function formatMoney(amount: { toString(): string }, currency = 'USD'): string {
  const value = Number(amount.toString());
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function formatAppointmentDateTime(
  date: Date,
  timezone?: string | null,
): string {
  const zone = timezone?.trim() || 'UTC';
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(zone)
    .toFormat("ccc, LLL d yyyy 'at' h:mm a");
}
