import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RootConfig } from '@app/core/config/configuration';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import {
  assertStripeReadyForPayments,
  parseStripeIntegrationConfig,
} from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { StripeApiService } from '@app/modules/integrations/integrations/stripe/services/stripe-api.service';
import { StripeConnectContextService } from '@app/modules/integrations/integrations/stripe/services/stripe-connect-context.service';
import { STRIPE_PAYMENT_PURPOSE } from '@app/modules/finance/payments/constants/stripe-payment-purpose.constants';
import {
  GIFT_CARD_ONLINE_MAX_AMOUNT,
  GIFT_CARD_ONLINE_MIN_AMOUNT,
} from '../constants/online-sales.constants';
import { OnlineGiftCardCheckoutDto } from '../dto/gift-card.dto';
import { toGiftCardPromotion } from '../mappers/gift-card.mapper';
import { GiftCardPromotionRepository } from '../repositories/gift-card-promotion.repository';
import { GiftCardSettingsRepository } from '../repositories/gift-card-settings.repository';
import { GiftCardSettingsService } from './gift-card-settings.service';
import { GiftCardsService } from './gift-cards.service';
import { isValidBookingSlug } from '../utils/gift-card-slug.util';

@Injectable()
export class GiftCardOnlineCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsRepository: GiftCardSettingsRepository,
    private readonly settingsService: GiftCardSettingsService,
    private readonly promotionRepository: GiftCardPromotionRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly stripeApiService: StripeApiService,
    private readonly stripeConnectContext: StripeConnectContextService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly giftCardsService: GiftCardsService,
  ) {}

  async getOnlineSalesShare(businessId: string) {
    const settings = await this.settingsRepository.findByBusinessId(businessId);
    const slug = settings?.onlineSalesEnabled
      ? await this.settingsService.ensurePublicSlug(businessId)
      : (settings?.publicSlug ?? null);
    const frontendUrl = this.configService.get('app', {
      infer: true,
    }).frontendUrl;
    const stripeReady = await this.isStripeReady(businessId);

    const hostedPageUrl = slug ? `${frontendUrl}/gift-cards/${slug}` : null;
    const embedUrl = slug ? `${frontendUrl}/embed/gift-cards/${slug}` : null;
    const iframeEmbed = embedUrl
      ? `<iframe src="${embedUrl}" width="100%" height="720" style="border:0;border-radius:12px;min-height:640px;max-width:100%;" loading="lazy" title="Purchase a gift card"></iframe>`
      : null;

    return {
      slug,
      onlineSalesEnabled: settings?.onlineSalesEnabled ?? false,
      stripeReady,
      hostedPageUrl,
      embedUrl,
      embedCode: iframeEmbed,
      iframeEmbed,
    };
  }

  async getPublicPage(slug: string) {
    const { business, settings } = await this.resolveBusinessBySlug(slug);
    if (!settings.onlineSalesEnabled) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Gift cards are not available',
        HttpStatus.NOT_FOUND,
      );
    }

    const promotions = await this.promotionRepository.findActive(business.id);
    const stripeReady = await this.isStripeReady(business.id);

    return {
      business: {
        id: business.id,
        name: business.displayName ?? business.name,
        logoUrl: null,
      },
      settings: {
        disclaimer: settings.purchaseDisclaimer,
        artworkUrl: this.settingsService.resolveArtworkUrl(settings),
        minAmount: GIFT_CARD_ONLINE_MIN_AMOUNT,
        maxAmount: GIFT_CARD_ONLINE_MAX_AMOUNT,
      },
      activePromotions: promotions.map(toGiftCardPromotion),
      stripeReady,
    };
  }

  async createPaymentIntent(slug: string, dto: OnlineGiftCardCheckoutDto) {
    if (dto.promotionId && dto.customAmount) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Provide either a promotion or a custom amount, not both',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!dto.promotionId && !dto.customAmount) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'A promotion or custom amount is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { business, settings } = await this.resolveBusinessBySlug(slug);
    if (!settings.onlineSalesEnabled) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Gift cards are not available',
        HttpStatus.NOT_FOUND,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        business.id,
        'stripe',
      );
    const stripeConfig = assertStripeReadyForPayments(integration);

    let cardValue: number;
    let salePriceCents: number;
    let promotionId: string | undefined;

    if (dto.promotionId) {
      const promotion = await this.promotionRepository.findById(
        business.id,
        dto.promotionId,
      );
      if (!promotion) {
        throw new AppException(
          ErrorCode.GIFT_CARD_PROMOTION_NOT_FOUND,
          'Promotion not found or inactive',
          HttpStatus.BAD_REQUEST,
        );
      }
      const active = await this.promotionRepository.findActive(business.id);
      if (!active.some((p) => p.id === promotion.id)) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Promotion is not currently active',
          HttpStatus.BAD_REQUEST,
        );
      }
      cardValue = Number(promotion.cardValue.toString());
      salePriceCents = Math.round(Number(promotion.salePrice.toString()) * 100);
      promotionId = promotion.id;
    } else {
      cardValue = dto.customAmount!;
      if (
        cardValue < GIFT_CARD_ONLINE_MIN_AMOUNT ||
        cardValue > GIFT_CARD_ONLINE_MAX_AMOUNT
      ) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          `Amount must be between $${GIFT_CARD_ONLINE_MIN_AMOUNT} and $${GIFT_CARD_ONLINE_MAX_AMOUNT}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      salePriceCents = Math.round(cardValue * 100);
    }

    const stripe = this.stripeApiService.getClient();
    const intent = await stripe.paymentIntents.create(
      {
        amount: salePriceCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        receipt_email: dto.purchaserEmail,
        metadata: {
          businessId: business.id,
          purpose: STRIPE_PAYMENT_PURPOSE.GIFT_CARD,
          type: 'gift_card',
          recipientEmail: dto.recipientEmail,
          recipientName: dto.recipientName,
          purchaserEmail: dto.purchaserEmail,
          purchaserName: dto.purchaserName,
          cardValue: cardValue.toFixed(2),
          ...(dto.giftMessage?.trim()
            ? { giftMessage: dto.giftMessage.trim() }
            : {}),
          ...(promotionId ? { promotionId } : {}),
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

    const publishableKey = this.stripeConnectContext.getPublishableKey();

    return {
      clientSecret: intent.client_secret,
      publishableKey,
      stripeAccountId: stripeConfig.stripeAccountId,
      salePrice: (salePriceCents / 100).toFixed(2),
      cardValue: cardValue.toFixed(2),
    };
  }

  async handleCheckoutSessionCompleted(metadata: Record<string, string>) {
    if (
      metadata.type !== 'gift_card' &&
      metadata.purpose !== STRIPE_PAYMENT_PURPOSE.GIFT_CARD
    ) {
      return false;
    }
    return this.fulfillOnlinePurchase(metadata);
  }

  async handlePaymentIntentCompleted(metadata: Record<string, string>) {
    if (
      metadata.type !== 'gift_card' &&
      metadata.purpose !== STRIPE_PAYMENT_PURPOSE.GIFT_CARD
    ) {
      return false;
    }
    return this.fulfillOnlinePurchase(metadata);
  }

  private async fulfillOnlinePurchase(metadata: Record<string, string>) {
    const businessId = metadata.businessId;
    if (!businessId) return false;

    const stripeRef =
      metadata.stripePaymentIntentId ?? metadata.stripeSessionId ?? '';
    if (stripeRef) {
      const existing = await this.prisma.giftCard.findFirst({
        where: {
          businessId,
          notes: { contains: stripeRef },
        },
      });
      if (existing) return true;
    }

    await this.giftCardsService.createFromOnlinePurchase(businessId, {
      recipientEmail: metadata.recipientEmail,
      recipientName: metadata.recipientName,
      purchaserEmail: metadata.purchaserEmail,
      purchaserName: metadata.purchaserName,
      cardValue: parseFloat(metadata.cardValue),
      promotionId: metadata.promotionId ?? null,
      giftMessage: metadata.giftMessage ?? null,
      stripeSessionId: metadata.stripeSessionId,
      stripePaymentIntentId: metadata.stripePaymentIntentId,
    });
    return true;
  }

  private async resolveBusinessBySlug(slug: string) {
    if (!isValidBookingSlug(slug)) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const settings = await this.settingsRepository.findByPublicSlug(slug);
    if (!settings) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const business = await this.prisma.business.findUnique({
      where: { id: settings.businessId },
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

  private async isStripeReady(businessId: string): Promise<boolean> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    try {
      assertStripeReadyForPayments(integration);
      return true;
    } catch {
      const parsed = parseStripeIntegrationConfig(integration?.config);
      return Boolean(parsed?.stripeAccountId);
    }
  }
}
