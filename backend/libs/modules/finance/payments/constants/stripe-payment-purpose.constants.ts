/** Stripe PaymentIntent / Checkout metadata.purpose values for webhook routing. */
export const STRIPE_PAYMENT_PURPOSE = {
  INVOICE: 'invoice',
  INVOICE_COLLECT: 'invoice_collect',
  CHECKOUT: 'payment',
  SAVE_CARD: 'save_card',
  GIFT_CARD: 'gift_card',
  PACKAGE: 'package',
  MEMBERSHIP: 'membership',
  BOOKING: 'booking',
} as const;

export type StripePaymentPurpose =
  (typeof STRIPE_PAYMENT_PURPOSE)[keyof typeof STRIPE_PAYMENT_PURPOSE];
