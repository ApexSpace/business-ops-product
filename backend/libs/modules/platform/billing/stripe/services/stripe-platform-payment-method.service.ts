import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformApiService } from './stripe-platform-api.service';

const PURPOSE = 'platform_subscription';

@Injectable()
export class StripePlatformPaymentMethodService {
  private readonly logger = new Logger(StripePlatformPaymentMethodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
  ) {}

  async getOrCreateCustomer(businessId: string): Promise<{
    localId: string;
    stripeCustomerId: string;
  }> {
    const existing = await this.prisma.businessStripeCustomer.findUnique({
      where: { businessId },
    });
    if (existing) {
      return {
        localId: existing.id,
        stripeCustomerId: existing.stripeCustomerId,
      };
    }

    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const stripe = this.stripeApi.getClient();
    const customer = await stripe.customers.create({
      name: business.name,
      email: business.email ?? undefined,
      metadata: { businessId, purpose: PURPOSE },
    });

    const row = await this.prisma.businessStripeCustomer.create({
      data: {
        businessId,
        stripeCustomerId: customer.id,
      },
    });

    return { localId: row.id, stripeCustomerId: customer.id };
  }

  async createSetupIntent(businessId: string): Promise<{
    clientSecret: string;
    publishableKey: string | null;
  }> {
    const { stripeCustomerId } = await this.getOrCreateCustomer(businessId);
    const stripe = this.stripeApi.getClient();
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: { businessId, purpose: PURPOSE },
    });

    if (!setupIntent.client_secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to create card setup session',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      clientSecret: setupIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null,
    };
  }

  async syncFromSetupIntent(setupIntent: {
    id?: string;
    customer?: string | { id?: string } | null;
    payment_method?: string | { id?: string } | null;
    metadata?: Record<string, string>;
  }): Promise<void> {
    const businessId = setupIntent.metadata?.businessId;
    if (!businessId || setupIntent.metadata?.purpose !== PURPOSE) {
      return;
    }

    const stripePaymentMethodId = this.resolveId(setupIntent.payment_method);
    const stripeCustomerId = this.resolveId(setupIntent.customer);
    if (!stripePaymentMethodId || !stripeCustomerId) {
      return;
    }

    const localCustomer = await this.prisma.businessStripeCustomer.findUnique({
      where: { businessId },
    });
    if (!localCustomer) {
      this.logger.warn(
        `setup_intent.succeeded for business ${businessId} but no local customer`,
      );
      return;
    }

    const existing = await this.prisma.businessPaymentMethod.findFirst({
      where: {
        businessId,
        stripePaymentMethodId,
        deletedAt: null,
      },
    });
    if (existing) {
      return;
    }

    const stripe = this.stripeApi.getClient();
    const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
    const card = pm.card;

    await this.prisma.businessPaymentMethod.updateMany({
      where: { businessId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });

    await this.prisma.businessPaymentMethod.create({
      data: {
        businessId,
        businessStripeCustomerId: localCustomer.id,
        stripePaymentMethodId,
        brand: card?.brand ?? null,
        last4: card?.last4 ?? null,
        expMonth: card?.exp_month ?? null,
        expYear: card?.exp_year ?? null,
        isDefault: true,
      },
    });

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: stripePaymentMethodId },
    });
  }

  async listPaymentMethods(businessId: string) {
    return this.prisma.businessPaymentMethod.findMany({
      where: { businessId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private resolveId(
    value: string | { id?: string } | null | undefined,
  ): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.id ?? null;
  }
}
