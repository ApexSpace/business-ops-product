import { api } from "@/lib/api/client";

export type PayableType = "INVOICE" | "BOOKING_DEPOSIT";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "WALLET"
  | "GIFT_CARD"
  | "STRIPE"
  | "OTHER";

export interface CollectPaymentTender {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  notes?: string;
  contactPaymentMethodId?: string;
  giftCardId?: string;
}

export interface CollectPaymentBody {
  payableType: PayableType;
  payableId: string;
  tenders: CollectPaymentTender[];
  channel?: "STAFF_POS" | "CUSTOMER_REMOTE" | "CUSTOMER_SELF_CHECKOUT";
  stripeMode?: "EMBEDDED" | "REDIRECT" | "NONE";
}

export interface StripeTenderResult {
  paymentId: string;
  clientSecret: string;
  stripePaymentIntentId: string;
}

export interface RedirectTenderResult {
  paymentId: string;
  checkoutUrl: string;
  sessionId: string;
}

export interface CollectPaymentResult {
  payableType: PayableType;
  payableId: string;
  completed: boolean;
  paymentIds: string[];
  stripeTenders: StripeTenderResult[];
  redirectTenders: RedirectTenderResult[];
}

export interface StripeConnectContext {
  ready: boolean;
  stripeAccountId?: string | null;
  publishableKey?: string | null;
  defaultCurrency?: string | null;
  livemode: boolean;
}

export function getStripeConnectContext() {
  return api.get<StripeConnectContext>("payments/stripe-context");
}

export function collectPayment(body: CollectPaymentBody) {
  return api.post<CollectPaymentResult>("payments/collect", body);
}
