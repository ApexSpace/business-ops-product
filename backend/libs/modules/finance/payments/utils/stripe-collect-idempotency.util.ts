/**
 * Stripe PaymentIntent idempotency for POS close / invoice collect.
 * Same payable + amount retries must map to the same PI (SALE-AUD-04).
 */
export function buildStripeCollectIdempotencyKey(
  payableId: string,
  amountCents: number,
  disambiguator?: string,
): string {
  const base = `close:${payableId}:${amountCents}`;
  return disambiguator ? `${base}:${disambiguator}` : base;
}

export function amountToCents(amount: { toString(): string } | string | number): number {
  return Math.round(Number(amount.toString()) * 100);
}
