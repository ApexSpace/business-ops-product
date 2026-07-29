export function formatPaidHoursDisplay(
  paidMinutes: number | null | undefined,
): string | null {
  if (paidMinutes == null || paidMinutes < 0) return null;
  if (paidMinutes < 60) return `${paidMinutes} min`;
  if (paidMinutes < 120) return "1 hr";
  return `${Math.round(paidMinutes / 60)} hr`;
}
