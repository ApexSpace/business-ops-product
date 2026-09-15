import { PayableType, PaymentMethod } from '@prisma/client';

export { PayableType };

export type PaymentChannel =
  | 'STAFF_POS'
  | 'CUSTOMER_REMOTE'
  | 'CUSTOMER_SELF_CHECKOUT';

export type StripeCollectionMode = 'EMBEDDED' | 'REDIRECT' | 'NONE';

export interface PayableSnapshot {
  amountDue: string;
  contactId: string;
  description: string;
  currency: string;
  invoiceId?: string;
}

export interface PaymentCompleteContext {
  businessId: string;
  payableType: PayableType;
  payableId: string;
  contactId: string;
  actorUserId?: string;
}

export interface CollectPaymentTender {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  notes?: string;
  contactPaymentMethodId?: string;
  giftCardId?: string;
}

export interface CollectPaymentInput {
  businessId: string;
  payableType: PayableType;
  payableId: string;
  tenders: CollectPaymentTender[];
  channel: PaymentChannel;
  stripeMode: StripeCollectionMode;
  actorUserId?: string;
  /** Allows tender total up to amountDue + tipAmount (staff POS gratuity). */
  tipAmount?: number;
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

export interface PayableHandler {
  readonly payableType: PayableType;
  resolvePayable(
    businessId: string,
    payableId: string,
  ): Promise<PayableSnapshot>;
  onPaymentComplete(ctx: PaymentCompleteContext): Promise<void>;
  syncPayablePayments?(businessId: string, payableId: string): Promise<void>;
}
