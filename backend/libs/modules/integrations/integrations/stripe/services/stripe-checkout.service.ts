import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { IntegrationStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { StripeApiService } from './stripe-api.service';

export interface CreateInvoiceCheckoutSessionResult {
  sessionId: string;
  url: string;
}

/**
 * Prepares Stripe Checkout sessions for invoice online payments (Connect).
 * Full invoice payment UI wiring is deferred; this service is the integration hook.
 */
@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);

  constructor(
    private readonly stripeApiService: StripeApiService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
  ) {}

  /**
   * Creates a Checkout Session on the connected Stripe account for an invoice.
   * @throws AppException when Stripe is not connected or invoice context is invalid
   */
  async createInvoiceCheckoutSession(
    invoiceId: string,
    businessId: string,
    options: {
      amountCents: number;
      currency: string;
      contactId?: string | null;
      description?: string;
    },
  ): Promise<CreateInvoiceCheckoutSessionResult> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Connect Stripe before accepting online invoice payments.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const config = integration.config as Record<string, unknown> | null;
    const stripeAccountId =
      typeof config?.stripeAccountId === 'string'
        ? config.stripeAccountId
        : null;

    if (!stripeAccountId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe account is not linked. Sync or reconnect Stripe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (config?.chargesEnabled === false) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe is connected, but account setup is incomplete. Complete onboarding in Stripe to accept payments.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    if (!frontendUrl) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'FRONTEND_URL is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

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
        success_url: `${frontendUrl}/business/payments/invoices/${invoiceId}?payment=success`,
        cancel_url: `${frontendUrl}/business/payments/invoices/${invoiceId}?payment=cancelled`,
        metadata: {
          businessId,
          invoiceId,
          contactId: options.contactId ?? '',
          provider: 'stripe',
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    );

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
