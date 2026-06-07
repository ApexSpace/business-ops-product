import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { buildInvoicePublicPath } from '@app/modules/finance/invoices/utils/invoice-public-token.util';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { assertStripeReadyForPayments } from '../utils/stripe-readiness.util';
import { StripeApiService } from './stripe-api.service';

export interface CreateInvoiceCheckoutSessionResult {
  sessionId: string;
  url: string;
}

/**
 * Creates Stripe Checkout sessions for invoice online payments on connected accounts.
 */
@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);

  constructor(
    private readonly stripeApiService: StripeApiService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
  ) {}

  async createInvoiceCheckoutSession(
    invoiceId: string,
    businessId: string,
    options: {
      amountCents: number;
      currency: string;
      contactId?: string | null;
      description?: string;
      publicToken: string;
    },
  ): Promise<CreateInvoiceCheckoutSessionResult> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    const config = assertStripeReadyForPayments(integration);

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    if (!frontendUrl) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'FRONTEND_URL is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const publicPath = buildInvoicePublicPath(options.publicToken);
    const successUrl = `${frontendUrl}${publicPath}?payment=success`;
    const cancelUrl = `${frontendUrl}${publicPath}?payment=cancelled`;

    const metadata = {
      businessId,
      invoiceId,
      contactId: options.contactId ?? '',
      provider: 'stripe',
    };

    const stripe = this.stripeApiService.getClient();

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: options.currency.toLowerCase(),
              unit_amount: options.amountCents,
              product_data: {
                name: options.description ?? `Invoice ${invoiceId}`,
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      },
      {
        stripeAccount: config.stripeAccountId,
      },
    );

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent &&
            typeof session.payment_intent === 'object' &&
            'id' in session.payment_intent &&
            typeof (session.payment_intent as { id?: string }).id === 'string'
          ? (session.payment_intent as { id: string }).id
          : null;

    if (paymentIntentId) {
      await stripe.paymentIntents.update(
        paymentIntentId,
        {
          metadata: {
            ...metadata,
            checkoutSessionId: session.id,
          },
        },
        { stripeAccount: config.stripeAccountId },
      );
    }

    if (!session.url) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to create Stripe checkout session',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `Created Stripe checkout session ${session.id} for invoice ${invoiceId}`,
    );

    return { sessionId: session.id, url: session.url };
  }
}
