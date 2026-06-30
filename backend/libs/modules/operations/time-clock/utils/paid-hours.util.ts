/** Format paid minutes as a human-readable duration string. */
export function formatPaidHoursDisplay(paidMinutes: number | null | undefined): string | null {
  if (paidMinutes == null || paidMinutes < 0) return null;
  if (paidMinutes < 60) return `${paidMinutes} min`;
  if (paidMinutes < 120) return '1 hr';
  return `${Math.round(paidMinutes / 60)} hr`;
}

export function computePaidMinutes(clockIn: Date, clockOut: Date): number {
  return Math.max(0, Math.round((clockOut.getTime() - clockIn.getTime()) / 60000));
}
