import { HttpStatus, Injectable } from '@nestjs/common';
import { PayableType } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { assertStripeReadyForPayments } from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import { StripeConnectContextService } from '@app/modules/integrations/integrations/stripe/services/stripe-connect-context.service';
import { STRIPE_PAYMENT_PURPOSE } from '../constants/stripe-payment-purpose.constants';
import { PayableHandlerRegistry } from '../registry/payable-handler.registry';
import {
  BookingDepositHoldPayload,
  BookingDepositHoldStore,
} from '../stores/booking-deposit-hold.store';

export type BookingDepositCheckoutResult = {
  paymentRequired: boolean;
  holdToken: string;
  paymentIntentId: string | null;
  amountCents: number;
  clientSecret: string | null;
  publishableKey: string | null;
  stripeAccountId: string | null;
};

@Injectable()
export class BookingDepositPaymentService {
  constructor(
    private readonly registry: PayableHandlerRegistry,
    private readonly holdStore: BookingDepositHoldStore,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly stripeApiService: StripeApiService,
    private readonly stripeConnectContext: StripeConnectContextService,
  ) {}

  async saveHold(holdToken: string, payload: BookingDepositHoldPayload) {
    await this.holdStore.save(holdToken, payload);
  }

  async releaseHold(holdToken?: string) {
    await this.holdStore.release(holdToken);
  }

  async assertHoldValid(
    holdToken: string,
    expected: Partial<BookingDepositHoldPayload>,
  ) {
    try {
      await this.holdStore.require(holdToken, expected);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'BOOKING_HOLD_EXPIRED') {
        throw new AppException(
          ErrorCode.BOOKING_SLOT_UNAVAILABLE,
          'Your reservation expired. Please select the time again.',
          HttpStatus.CONFLICT,
        );
      }
      if (message === 'BOOKING_HOLD_MISMATCH') {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Reservation does not match the selected slot',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw err;
    }
  }

  async createCheckout(params: {
    holdToken: string;
    paymentRequired: boolean;
    holdPayload: BookingDepositHoldPayload;
  }): Promise<BookingDepositCheckoutResult> {
    await this.holdStore.save(params.holdToken, params.holdPayload);

    if (!params.paymentRequired) {
      return {
        paymentRequired: false,
        holdToken: params.holdToken,
        paymentIntentId: null,
        amountCents: 0,
        clientSecret: null,
        publishableKey: null,
        stripeAccountId: null,
      };
    }

    const handler = this.registry.get(PayableType.BOOKING_DEPOSIT);
    const snapshot = await handler.resolvePayable(
      params.holdPayload.businessId,
      params.holdToken,
    );

    const amountDue = Number(snapshot.amountDue);
    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This service does not have a price configured for online payment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        params.holdPayload.businessId,
        'stripe',
      );
    const stripeConfig = assertStripeReadyForPayments(integration);
    const stripe = this.stripeApiService.getClient();
    const amountCents = Math.round(amountDue * 100);

    const intent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: snapshot.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          businessId: params.holdPayload.businessId,
          purpose: STRIPE_PAYMENT_PURPOSE.BOOKING,
          payableType: PayableType.BOOKING_DEPOSIT,
          payableId: params.holdToken,
          type: 'booking',
          publicSlug: params.holdPayload.publicSlug,
          serviceId: params.holdPayload.serviceId,
          staffId: params.holdPayload.staffId ?? '',
          startAt: params.holdPayload.startAt,
          endAt: params.holdPayload.endAt,
          holdToken: params.holdToken,
          contactId: params.holdPayload.contactId ?? '',
        },
      },
      { stripeAccount: stripeConfig.stripeAccountId },
    );

    if (!intent.client_secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Unable to create payment',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      paymentRequired: true,
      holdToken: params.holdToken,
      paymentIntentId: intent.id,
      amountCents,
      clientSecret: intent.client_secret,
      publishableKey: this.stripeConnectContext.getPublishableKey(),
      stripeAccountId: stripeConfig.stripeAccountId,
    };
  }

  async verifyPaymentIntent(
    businessId: string,
    paymentIntentId: string,
    expected: { serviceId: string; holdToken?: string },
  ) {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    const stripeConfig = assertStripeReadyForPayments(integration);
    const stripe = this.stripeApiService.getClient();
    const intent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      undefined,
      { stripeAccount: stripeConfig.stripeAccountId },
    );

    if (intent.status !== 'succeeded' && intent.status !== 'processing') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment has not been completed',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (intent.metadata?.purpose !== STRIPE_PAYMENT_PURPOSE.BOOKING) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid payment for booking',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (intent.metadata?.payableType !== PayableType.BOOKING_DEPOSIT) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid payment for booking',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (intent.metadata?.serviceId !== expected.serviceId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment does not match the selected service',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      expected.holdToken &&
      intent.metadata?.holdToken &&
      intent.metadata.holdToken !== expected.holdToken
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment does not match the reservation',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
