import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { SubscriptionBillingSource } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import type { PortalSessionResponseDto } from '../dto/stripe-platform-billing.dto';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';

@Injectable()
export class StripePlatformPortalService {
  private readonly logger = new Logger(StripePlatformPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly metadataService: StripePlatformMetadataService,
  ) {}

  async createPortalSession(businessId: string): Promise<PortalSessionResponseDto> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (subscription?.billingSource !== SubscriptionBillingSource.STRIPE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe billing is not active for this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription.metadata,
    );
    if (!stripeMeta?.customerId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No Stripe customer is linked to this subscription',
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

    const stripe = this.stripeApi.getClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeMeta.customerId,
      return_url: `${frontendUrl}/business/settings/billing`,
    });

    if (!session.url) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Failed to create Stripe portal session',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Created portal session for business ${businessId}`);
    return { url: session.url };
  }
}
