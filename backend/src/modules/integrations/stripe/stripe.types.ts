/** Minimal Stripe shapes used by Connect integration (avoids SDK namespace typing issues). */

export type StripeConnectAccount = {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  default_currency?: string | null;
  country?: string | null;
  email?: string | null;
  livemode?: boolean;
  business_profile?: { name?: string | null } | null;
  settings?: { dashboard?: { display_name?: string | null } } | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: Record<string, unknown> };
};

export type StripeWebhookMetadata = Record<string, string> | null;
