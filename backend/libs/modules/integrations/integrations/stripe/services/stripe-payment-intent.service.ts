import { Injectable } from '@nestjs/common';
import { PayableType } from '@prisma/client';
import type { PaymentChannel } from '@app/modules/finance/payments/types/payable.types';
import { StripeApiService } from './stripe-api.service';
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
}

export interface CreatePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  /** When saved card succeeds immediately without client confirmation. */
  succeeded?: boolean;
}

@Injectable()
export class StripePaymentIntentService {
  constructor(
    private readonly stripeApi: StripeApiService,
    private readonly connectContext: StripeConnectContextService,
    private readonly customerService: StripeCustomerService,
  ) {}

  async createForPayment(
    input: CreatePaymentIntentInput,
  ): Promise<CreatePaymentIntentResult> {
    const stripeAccountId = await this.connectContext.requireStripeAccountId(
      input.businessId,
    );
    const { stripeCustomerId } = await this.customerService.getOrCreateForContact(
      input.businessId,
      input.contactId,
    );

    const stripe = this.stripeApi.getClient();
    const cardOnly = input.channel !== 'CUSTOMER_SELF_CHECKOUT';
    const intent = await stripe.paymentIntents.create(
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
      { stripeAccount: stripeAccountId },
    );

    if (!intent.client_secret) {
      throw new Error('Stripe PaymentIntent missing client_secret');
    }

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      succeeded: intent.status === 'succeeded',
    };
  }
}
