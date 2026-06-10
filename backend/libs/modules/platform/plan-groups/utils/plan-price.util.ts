/**
 * Formats a plan price using the currency symbol only (no ISO code suffix).
 */
export function formatPlanPrice(
  amount: string | null | undefined,
  currencyCode: string,
): string {
  if (amount == null || amount === '') return '—';
  const currency = currencyCode?.trim() || 'USD';
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return amount;

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numeric);

    return formatted
      .replace(new RegExp(`\\s*${currency}\\s*$`, 'i'), '')
      .trim();
  } catch {
    try {
      const parts = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
      }).formatToParts(0);
      const symbol =
        parts.find((part) => part.type === 'currency')?.value ?? '$';
      return `${symbol}${amount}`;
    } catch {
      return amount;
    }
  }
}

export function planPricePeriodSuffix(cycle: 'MONTHLY' | 'YEARLY'): string {
  return cycle === 'YEARLY' ? '/year' : '/month';
}
