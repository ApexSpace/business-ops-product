import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import { StripeConnectContextService } from '@app/modules/integrations/integrations/stripe/services/stripe-connect-context.service';
import { StripeCustomerService } from '@app/modules/integrations/integrations/stripe/services/stripe-customer.service';
import { STRIPE_PAYMENT_PURPOSE } from '../constants/stripe-payment-purpose.constants';
import { ContactPaymentMethodRepository } from '../repositories/contact-payment-method.repository';

type SetupIntentObject = {
  id?: string;
  customer?: string | { id?: string } | null;
  payment_method?: string | { id?: string } | null;
  metadata?: Record<string, string>;
};

@Injectable()
export class StripeContactPaymentMethodService {
  private readonly logger = new Logger(StripeContactPaymentMethodService.name);

  constructor(
    private readonly stripeApi: StripeApiService,
    private readonly connectContext: StripeConnectContextService,
    private readonly customerService: StripeCustomerService,
    private readonly paymentMethodRepository: ContactPaymentMethodRepository,
  ) {}

  async createSetupIntent(
    businessId: string,
    contactId: string,
  ): Promise<{
    clientSecret: string;
    publishableKey: string | null;
    stripeAccountId: string;
  }> {
    const chargeCtx =
      await this.connectContext.resolveTenantStripeChargeContext(businessId);
    const { stripeCustomerId } =
      await this.customerService.getOrCreateForContact(businessId, contactId);

    const setupIntent = await chargeCtx.stripe.setupIntents.create(
      {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        metadata: {
          businessId,
          contactId,
          purpose: STRIPE_PAYMENT_PURPOSE.SAVE_CARD,
        },
      },
      { stripeAccount: chargeCtx.stripeAccountId },
    );

    if (!setupIntent.client_secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to create card setup session',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      clientSecret: setupIntent.client_secret,
      publishableKey: chargeCtx.publishableKey,
      stripeAccountId: chargeCtx.stripeAccountId,
    };
  }

  async syncFromSetupIntent(setupIntent: SetupIntentObject): Promise<void> {
    const metadata = setupIntent.metadata ?? {};
    const businessId = metadata.businessId;
    const contactId = metadata.contactId;
    if (!businessId || !contactId) {
      this.logger.warn('setup_intent.succeeded missing businessId/contactId');
      return;
    }

    const stripePaymentMethodId = this.resolveId(setupIntent.payment_method);
    const stripeCustomerId = this.resolveId(setupIntent.customer);
    if (!stripePaymentMethodId || !stripeCustomerId) {
      return;
    }

    const existing =
      await this.paymentMethodRepository.findByStripePaymentMethodId(
        businessId,
        stripePaymentMethodId,
      );
    if (existing) {
      return;
    }

    const chargeCtx =
      await this.connectContext.resolveTenantStripeChargeContext(businessId);
    const pm = await chargeCtx.stripe.paymentMethods.retrieve(
      stripePaymentMethodId,
      {},
      { stripeAccount: chargeCtx.stripeAccountId },
    );

    const card = pm.card;
    const methods = await this.paymentMethodRepository.findManyForContact(
      businessId,
      contactId,
    );
    const isFirst = methods.length === 0;

    if (isFirst) {
      await this.paymentMethodRepository.clearDefaultForContact(
        businessId,
        contactId,
      );
    }

    await this.paymentMethodRepository.create({
      businessId,
      contactId,
      stripeCustomerId,
      stripePaymentMethodId,
      brand: card?.brand ?? null,
      last4: card?.last4 ?? null,
      expMonth: card?.exp_month ?? null,
      expYear: card?.exp_year ?? null,
      isDefault: isFirst,
    });
  }

  async detach(
    businessId: string,
    contactId: string,
    paymentMethodId: string,
  ): Promise<void> {
    const row = await this.paymentMethodRepository.findById(
      businessId,
      contactId,
      paymentMethodId,
    );
    if (!row) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Saved card not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const chargeCtx =
      await this.connectContext.resolveTenantStripeChargeContext(businessId);

    try {
      await chargeCtx.stripe.paymentMethods.detach(
        row.stripePaymentMethodId,
        {},
        { stripeAccount: chargeCtx.stripeAccountId },
      );
    } catch (error) {
      this.stripeApi.logStripeError('paymentMethods.detach', error);
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Could not remove saved card',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.paymentMethodRepository.softDelete(row.id);
  }

  private resolveId(
    value: string | { id?: string } | null | undefined,
  ): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.id ?? null;
  }
}
