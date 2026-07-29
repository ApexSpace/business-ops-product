import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ClientPackageSource } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { assertStripeReadyForPayments } from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import { StripeConnectContextService } from '@app/modules/integrations/integrations/stripe/services/stripe-connect-context.service';
import { STRIPE_PAYMENT_PURPOSE } from '@app/modules/finance/payments/constants/stripe-payment-purpose.constants';
import { InitiatePackageCheckoutDto } from '../dto/package.dto';
import { toPackageServiceGroup } from '../mappers/package.mapper';
import { ClientPackageRepository } from '../repositories/client-package.repository';
import { PackageSettingsRepository } from '../repositories/package-settings.repository';
import { PackageTemplateRepository } from '../repositories/package-template.repository';
import { ClientPackagesService } from './client-packages.service';
import { PackageEmailService } from './package-email.service';
import { PackageSettingsService } from './package-settings.service';

@Injectable()
export class PackageOnlineCheckoutService {
  private readonly logger = new Logger(PackageOnlineCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsRepository: PackageSettingsRepository,
    private readonly settingsService: PackageSettingsService,
    private readonly templateRepository: PackageTemplateRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly stripeApiService: StripeApiService,
    private readonly stripeConnectContext: StripeConnectContextService,
    private readonly contactRepository: ContactRepository,
    private readonly clientPackageRepository: ClientPackageRepository,
    private readonly clientPackagesService: ClientPackagesService,
    private readonly packageEmailService: PackageEmailService,
  ) {}

  async getPublicCatalog(slug: string) {
    const { business, settings } = await this.resolveBusinessBySlug(slug);

    if (!settings.onlineSalesEnabled) {
      throw new AppException(
        ErrorCode.PACKAGE_ONLINE_SALES_DISABLED,
        'Online package sales are not enabled',
        HttpStatus.NOT_FOUND,
      );
    }

    const templates = await this.templateRepository.findOnlineTemplates(
      business.id,
    );
    const stripeReady = await this.settingsService.isStripeReady(business.id);

    return {
      business: {
        id: business.id,
        name: business.displayName ?? business.name,
      },
      packages: templates.map((t) => ({
        id: t.id,
        name: t.name,
        emoji: t.emoji,
        totalPrice: t.totalPrice.toFixed(2),
        shortDescription: t.shortDescription,
      })),
      stripeReady,
    };
  }

  async getPackageForCheckout(tenantSlug: string, templateId: string) {
    const { business, settings } = await this.resolveBusinessBySlug(tenantSlug);

    if (!settings.onlineSalesEnabled) {
      throw new AppException(
        ErrorCode.PACKAGE_ONLINE_SALES_DISABLED,
        'Online package sales are not enabled',
        HttpStatus.NOT_FOUND,
      );
    }

    const template = await this.templateRepository.findPublicTemplate(
      business.id,
      templateId,
    );
    if (!template) {
      throw new AppException(
        ErrorCode.PACKAGE_TEMPLATE_NOT_FOUND,
        'Package not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const stripeReady = await this.settingsService.isStripeReady(business.id);

    return {
      business: {
        id: business.id,
        name: business.displayName ?? business.name,
      },
      package: {
        id: template.id,
        name: template.name,
        emoji: template.emoji,
        totalPrice: template.totalPrice.toFixed(2),
        shortDescription: template.shortDescription,
        description: template.description,
        requireAgreement: template.requireAgreement,
        agreementText: template.agreementText,
        serviceGroups: template.serviceGroups.map(toPackageServiceGroup),
      },
      stripeReady,
    };
  }

  async initiateCheckout(
    tenantSlug: string,
    templateId: string,
    dto: InitiatePackageCheckoutDto,
  ) {
    const { business, settings } = await this.resolveBusinessBySlug(tenantSlug);

    if (!settings.onlineSalesEnabled) {
      throw new AppException(
        ErrorCode.PACKAGE_ONLINE_SALES_DISABLED,
        'Online package sales are not enabled',
        HttpStatus.NOT_FOUND,
      );
    }

    const template = await this.templateRepository.findPublicTemplate(
      business.id,
      templateId,
    );
    if (!template) {
      throw new AppException(
        ErrorCode.PACKAGE_TEMPLATE_NOT_FOUND,
        'Package not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        business.id,
        'stripe',
      );
    const stripeConfig = assertStripeReadyForPayments(integration);

    const contact = await this.findOrCreateContact(business.id, dto);
    const amountCents = Math.round(
      Number(template.totalPrice.toString()) * 100,
    );

    const stripe = this.stripeApiService.getClient();
    const intent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        receipt_email: dto.email,
        metadata: {
          businessId: business.id,
          purpose: STRIPE_PAYMENT_PURPOSE.PACKAGE,
          type: 'package',
          templateId: template.id,
          contactId: contact.id,
          purchaserEmail: dto.email,
          purchaserName: `${dto.firstName} ${dto.lastName}`.trim(),
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
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      publishableKey: this.stripeConnectContext.getPublishableKey(),
      stripeAccountId: stripeConfig.stripeAccountId,
      totalPrice: template.totalPrice.toFixed(2),
    };
  }

  async handleCheckoutSessionCompleted(metadata: Record<string, string>) {
    if (
      metadata.type !== 'package' &&
      metadata.purpose !== STRIPE_PAYMENT_PURPOSE.PACKAGE
    ) {
      return false;
    }
    return this.fulfillOnlinePurchase(metadata);
  }

  async handlePaymentIntentCompleted(metadata: Record<string, string>) {
    if (
      metadata.type !== 'package' &&
      metadata.purpose !== STRIPE_PAYMENT_PURPOSE.PACKAGE
    ) {
      return false;
    }
    return this.fulfillOnlinePurchase(metadata);
  }

  private async fulfillOnlinePurchase(metadata: Record<string, string>) {
    const businessId = metadata.businessId;
    const templateId = metadata.templateId;
    const contactId = metadata.contactId;
    const stripePaymentIntentId = metadata.stripePaymentIntentId ?? '';

    if (!businessId || !templateId || !contactId) return false;

    if (stripePaymentIntentId) {
      const existing =
        await this.clientPackageRepository.findByStripePaymentIntent(
          businessId,
          stripePaymentIntentId,
        );
      if (existing) return true;
    }

    const template = await this.templateRepository.findById(
      businessId,
      templateId,
    );
    if (!template) return false;

    const clientPackage = await this.clientPackagesService.create(
      businessId,
      {
        contactId,
        packageTemplateId: templateId,
      },
      {
        source: ClientPackageSource.ONLINE,
        stripePaymentIntentId: stripePaymentIntentId || undefined,
      },
    );

    try {
      await this.sendOnlinePurchaseEmails({
        businessId,
        template,
        clientPackage,
        purchaserEmail: metadata.purchaserEmail ?? '',
        purchaserName: metadata.purchaserName ?? '',
      });
    } catch (error) {
      this.logger.error(
        `Failed to send package purchase emails for ${clientPackage.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return true;
  }

  private async sendOnlinePurchaseEmails(params: {
    businessId: string;
    template: NonNullable<
      Awaited<ReturnType<PackageTemplateRepository['findById']>>
    >;
    clientPackage: Awaited<ReturnType<ClientPackagesService['create']>>;
    purchaserEmail: string;
    purchaserName: string;
  }) {
    const business = await this.prisma.business.findFirst({
      where: { id: params.businessId, deletedAt: null },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
      },
    });
    if (!business) return;

    const amountPaid = params.template.totalPrice.toFixed(2);

    await this.packageEmailService.sendPurchaseConfirmation({
      business,
      clientPackage: params.clientPackage,
      purchaserEmail: params.purchaserEmail,
      purchaserName: params.purchaserName,
      amountPaid,
    });

    const notifyEmail = await this.resolveInternalNotifyEmail(
      params.businessId,
      business.email,
    );
    if (notifyEmail) {
      await this.packageEmailService.sendInternalNotification({
        business,
        clientPackage: params.clientPackage,
        notifyEmail,
        purchaserName: params.purchaserName,
        amountPaid,
      });
    }
  }

  private async resolveInternalNotifyEmail(
    businessId: string,
    businessEmail?: string | null,
  ): Promise<string | null> {
    const giftCardSettings = await this.prisma.giftCardSettings.findUnique({
      where: { businessId },
      select: { internalNotifyEmail: true },
    });
    const giftCardNotify = giftCardSettings?.internalNotifyEmail?.trim();
    if (giftCardNotify) return giftCardNotify;

    const businessNotify = businessEmail?.trim();
    return businessNotify || null;
  }

  private async resolveBusinessBySlug(slug: string) {
    const settings = await this.settingsRepository.findByPublicSlug(slug);
    if (!settings) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const business = await this.prisma.business.findFirst({
      where: { id: settings.businessId, deletedAt: null },
      select: {
        id: true,
        name: true,
        displayName: true,
      },
    });

    if (!business) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return { business, settings };
  }

  private async findOrCreateContact(
    businessId: string,
    dto: InitiatePackageCheckoutDto,
  ) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.contact.findFirst({
      where: {
        businessId,
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) return existing;

    return this.contactRepository.createPublic(businessId, {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      phoneNumber: dto.phone?.trim() || undefined,
    });
  }
}
