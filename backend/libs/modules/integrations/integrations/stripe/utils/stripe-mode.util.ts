import Stripe from 'stripe';

export type StripePaymentsMode = 'live' | 'test';

type StripeClient = InstanceType<typeof Stripe>;

export function normalizeStripePaymentsMode(
  value: unknown,
): StripePaymentsMode {
  return value === 'test' ? 'test' : 'live';
}

export function getStripeApiVersion(): string {
  return process.env.STRIPE_API_VERSION?.trim() || '2025-05-28.basil';
}

export function getStripeSecretForMode(
  mode: StripePaymentsMode,
): string | null {
  if (mode === 'test') {
    return (
      process.env.STRIPE_SECRET_KEY_TEST?.trim() ||
      // Dev convenience: if primary key is already test, reuse it.
      (process.env.STRIPE_SECRET_KEY?.trim()?.startsWith('sk_test_')
        ? process.env.STRIPE_SECRET_KEY.trim()
        : null)
    );
  }
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

export function getStripePublishableForMode(
  mode: StripePaymentsMode,
): string | null {
  if (mode === 'test') {
    return (
      process.env.STRIPE_PUBLISHABLE_KEY_TEST?.trim() ||
      (process.env.STRIPE_PUBLISHABLE_KEY?.trim()?.startsWith('pk_test_')
        ? process.env.STRIPE_PUBLISHABLE_KEY.trim()
        : null)
    );
  }
  return process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null;
}

export function isStripeModeConfigured(mode: StripePaymentsMode): boolean {
  return !!getStripeSecretForMode(mode);
}

export function createStripeClient(secret: string): StripeClient {
  return new Stripe(secret, {
    apiVersion: getStripeApiVersion() as never,
  });
}

/** Extract paymentsMode from business.settings JSON. Defaults to live. */
export function readPaymentsModeFromSettings(
  settings: unknown,
): StripePaymentsMode {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return 'live';
  }
  const payments = (settings as Record<string, unknown>).payments;
  if (!payments || typeof payments !== 'object' || Array.isArray(payments)) {
    return 'live';
  }
  return normalizeStripePaymentsMode(
    (payments as Record<string, unknown>).mode,
  );
}

export function mergePaymentsModeIntoSettings(
  settings: unknown,
  mode: StripePaymentsMode,
): Record<string, unknown> {
  const base =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  const payments =
    base.payments &&
    typeof base.payments === 'object' &&
    !Array.isArray(base.payments)
      ? { ...(base.payments as Record<string, unknown>) }
      : {};
  payments.mode = mode;
  base.payments = payments;
  return base;
}
