import { Injectable } from '@nestjs/common';
import { PayableType } from '@prisma/client';
import type { PaymentChannel } from '@app/modules/finance/payments/types/payable.types';
import { StripeConnectContextService } from './stripe-connect-context.service';
import { StripeCustomerService } from './stripe-customer.service';

export interface CreatePaymentIntentInput {
  businessId: string;
  contactId: string;
  amountCents: number;
  currency: string;
  description: string;
  paymentId: string;
  payableType: PayableType;
  payableId: string;
  purpose: string;
  invoiceId?: string;
  /** Staff POS / remote: card only. Self-checkout may enable additional methods. */
  channel?: PaymentChannel;
  /** Charge a saved card on file (off-session when possible). */
  stripePaymentMethodId?: string;
  /**
   * Stripe Idempotency-Key so close/collect retries do not open a second PI
   * (SALE-AUD-04). Must be stable for the same payable + amount.
   */
  idempotencyKey?: string;
}

export interface CreatePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  /** When saved card succeeds immediately without client confirmation. */
  succeeded?: boolean;
  canceled?: boolean;
}

@Injectable()
export class StripePaymentIntentService {
  constructor(
    private readonly connectContext: StripeConnectContextService,
    private readonly customerService: StripeCustomerService,
  ) {}

  async createForPayment(
    input: CreatePaymentIntentInput,
  ): Promise<CreatePaymentIntentResult> {
    const chargeCtx =
      await this.connectContext.resolveTenantStripeChargeContext(
        input.businessId,
      );
    const { stripeCustomerId } =
      await this.customerService.getOrCreateForContact(
        input.businessId,
        input.contactId,
      );

    const cardOnly = input.channel !== 'CUSTOMER_SELF_CHECKOUT';
    const intent = await chargeCtx.stripe.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        customer: stripeCustomerId,
        description: input.description,
        ...(input.stripePaymentMethodId
          ? {
              payment_method: input.stripePaymentMethodId,
              confirm: true,
              off_session: true,
            }
          : cardOnly
            ? { payment_method_types: ['card'] }
            : { automatic_payment_methods: { enabled: true } }),
        metadata: {
          purpose: input.purpose,
          businessId: input.businessId,
          contactId: input.contactId,
          payableType: input.payableType,
          payableId: input.payableId,
          paymentId: input.paymentId,
          invoiceId: input.invoiceId ?? input.payableId,
          provider: 'stripe',
        },
      },
      {
        stripeAccount: chargeCtx.stripeAccountId,
        ...(input.idempotencyKey
          ? { idempotencyKey: input.idempotencyKey }
          : {}),
      },
    );

    return this.toCreatePaymentIntentResult(intent);
  }

  async retrieveForPayment(input: {
    businessId: string;
    paymentIntentId: string;
  }): Promise<CreatePaymentIntentResult> {
    const chargeCtx =
      await this.connectContext.resolveTenantStripeChargeContext(
        input.businessId,
      );
    const intent = await chargeCtx.stripe.paymentIntents.retrieve(
      input.paymentIntentId,
      undefined,
      { stripeAccount: chargeCtx.stripeAccountId },
    );
    return this.toCreatePaymentIntentResult(intent);
  }

  private toCreatePaymentIntentResult(intent: {
    id: string;
    client_secret: string | null;
    status: string;
  }): CreatePaymentIntentResult {
    const succeeded = intent.status === 'succeeded';
    const canceled = intent.status === 'canceled';
    if (!intent.client_secret && !succeeded && !canceled) {
      throw new Error('Stripe PaymentIntent missing client_secret');
    }

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret ?? '',
      succeeded,
      canceled,
    };
  }

  async cancelForPayment(
    businessId: string,
    paymentIntentId: string,
  ): Promise<void> {
    const chargeCtx =
      await this.connectContext.resolveTenantStripeChargeContext(businessId);
    await chargeCtx.stripe.paymentIntents.cancel(
      paymentIntentId,
      undefined,
      { stripeAccount: chargeCtx.stripeAccountId },
    );
  }
}
