import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { PLATFORM_SUBSCRIPTION_PURPOSE } from '../types/stripe-platform-billing.types';
import { StripePlatformApiService } from './stripe-platform-api.service';

type SetupIntentLike = {
  id?: string;
  status?: string | null;
  customer?: string | { id?: string } | null;
  payment_method?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
};

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
      metadata: { businessId, purpose: PLATFORM_SUBSCRIPTION_PURPOSE },
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
      metadata: { businessId, purpose: PLATFORM_SUBSCRIPTION_PURPOSE },
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

  /**
   * Client confirmed SetupIntent with Stripe.js — sync the payment method into
   * our DB immediately (webhook remains an idempotent backup).
   */
  async confirmSetupIntent(businessId: string, setupIntentId: string) {
    const stripe = this.stripeApi.getClient();
    let setupIntent: SetupIntentLike;
    try {
      setupIntent = (await stripe.setupIntents.retrieve(
        setupIntentId,
      )) as SetupIntentLike;
    } catch (error) {
      this.stripeApi.logStripeError('setupIntents.retrieve', error);
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Could not verify saved card with Stripe',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      setupIntent.metadata?.businessId !== businessId ||
      setupIntent.metadata?.purpose !== PLATFORM_SUBSCRIPTION_PURPOSE
    ) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Card setup does not belong to this business',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      setupIntent.status !== 'succeeded' &&
      setupIntent.status !== 'processing'
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Card setup is not complete yet',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.syncFromSetupIntent(setupIntent);
    return this.prisma.businessPaymentMethod.findMany({
      where: { businessId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        brand: true,
        last4: true,
        expMonth: true,
        expYear: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  async syncFromSetupIntent(setupIntent: SetupIntentLike): Promise<void> {
    const businessId = setupIntent.metadata?.businessId;
    if (
      !businessId ||
      setupIntent.metadata?.purpose !== PLATFORM_SUBSCRIPTION_PURPOSE
    ) {
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

    await this.upsertLocalPaymentMethod({
      businessId,
      localCustomerId: localCustomer.id,
      stripeCustomerId,
      stripePaymentMethodId,
      makeDefault: true,
    });
  }

  async listPaymentMethods(businessId: string) {
    await this.reconcileFromStripe(businessId);
    return this.prisma.businessPaymentMethod.findMany({
      where: { businessId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        brand: true,
        last4: true,
        expMonth: true,
        expYear: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  /**
   * Stripe is source of truth for attached cards. Mirror pm_… ids + display
   * fields (last4/brand/exp) into BusinessPaymentMethod so local webhooks are
   * not required for the UI to show cards.
   */
  async reconcileFromStripe(businessId: string): Promise<void> {
    const localCustomer = await this.prisma.businessStripeCustomer.findUnique({
      where: { businessId },
    });
    if (!localCustomer) {
      return;
    }

    try {
      const stripe = this.stripeApi.getClient();
      const [listed, customer] = await Promise.all([
        stripe.paymentMethods.list({
          customer: localCustomer.stripeCustomerId,
          type: 'card',
        }),
        stripe.customers.retrieve(localCustomer.stripeCustomerId),
      ]);

      if (customer.deleted) {
        return;
      }

      const defaultPmId = this.resolveId(
        customer.invoice_settings?.default_payment_method,
      );

      const existing = await this.prisma.businessPaymentMethod.findMany({
        where: { businessId, deletedAt: null },
      });
      const byStripeId = new Map(
        existing.map((row) => [row.stripePaymentMethodId, row]),
      );
      const stripeIds = new Set(listed.data.map((pm) => pm.id));

      for (const pm of listed.data) {
        const card = pm.card;
        const isDefault = defaultPmId
          ? defaultPmId === pm.id
          : listed.data[0]?.id === pm.id;
        const row = byStripeId.get(pm.id);

        if (row) {
          await this.prisma.businessPaymentMethod.update({
            where: { id: row.id },
            data: {
              brand: card?.brand ?? null,
              last4: card?.last4 ?? null,
              expMonth: card?.exp_month ?? null,
              expYear: card?.exp_year ?? null,
              isDefault,
            },
          });
          continue;
        }

        await this.prisma.businessPaymentMethod.create({
          data: {
            businessId,
            businessStripeCustomerId: localCustomer.id,
            stripePaymentMethodId: pm.id,
            brand: card?.brand ?? null,
            last4: card?.last4 ?? null,
            expMonth: card?.exp_month ?? null,
            expYear: card?.exp_year ?? null,
            isDefault,
          },
        });
      }

      for (const row of existing) {
        if (!stripeIds.has(row.stripePaymentMethodId)) {
          await this.prisma.businessPaymentMethod.update({
            where: { id: row.id },
            data: { deletedAt: new Date(), isDefault: false },
          });
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to reconcile payment methods from Stripe for business ${businessId}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async upsertLocalPaymentMethod(input: {
    businessId: string;
    localCustomerId: string;
    stripeCustomerId: string;
    stripePaymentMethodId: string;
    makeDefault: boolean;
  }): Promise<void> {
    const existing = await this.prisma.businessPaymentMethod.findFirst({
      where: {
        businessId: input.businessId,
        stripePaymentMethodId: input.stripePaymentMethodId,
        deletedAt: null,
      },
    });
    if (existing) {
      if (input.makeDefault && !existing.isDefault) {
        await this.prisma.businessPaymentMethod.updateMany({
          where: {
            businessId: input.businessId,
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
        await this.prisma.businessPaymentMethod.update({
          where: { id: existing.id },
          data: { isDefault: true },
        });
      }
      return;
    }

    const stripe = this.stripeApi.getClient();
    const pm = await stripe.paymentMethods.retrieve(
      input.stripePaymentMethodId,
    );
    const card = pm.card;

    if (input.makeDefault) {
      await this.prisma.businessPaymentMethod.updateMany({
        where: {
          businessId: input.businessId,
          isDefault: true,
          deletedAt: null,
        },
        data: { isDefault: false },
      });
    }

    await this.prisma.businessPaymentMethod.create({
      data: {
        businessId: input.businessId,
        businessStripeCustomerId: input.localCustomerId,
        stripePaymentMethodId: input.stripePaymentMethodId,
        brand: card?.brand ?? null,
        last4: card?.last4 ?? null,
        expMonth: card?.exp_month ?? null,
        expYear: card?.exp_year ?? null,
        isDefault: input.makeDefault,
      },
    });

    if (input.makeDefault) {
      await stripe.customers.update(input.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: input.stripePaymentMethodId,
        },
      });
    }
  }

  private resolveId(
    value: string | { id?: string } | null | undefined,
  ): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.id ?? null;
  }
}
