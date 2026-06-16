import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { SubscriptionBillingSource } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessAccessService } from '@app/modules/platform/business/services/business-access.service';
import type { BusinessAccessDto } from '@app/modules/platform/business/dto/business-access.dto';
import type { StripeSubscriptionObject } from '../types/stripe-platform-billing.types';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformSyncService } from './stripe-platform-sync.service';

@Injectable()
export class StripePlatformResyncService {
  private readonly logger = new Logger(StripePlatformResyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly syncService: StripePlatformSyncService,
    private readonly accessService: BusinessAccessService,
  ) {}

  async resyncSubscription(
    businessId: string,
    actor: RequestUser,
  ): Promise<BusinessAccessDto> {
    const local = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (local?.billingSource !== SubscriptionBillingSource.STRIPE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe billing is not active for this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      local.metadata,
    );
    if (!stripeMeta?.subscriptionId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No Stripe subscription is linked',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripe = this.stripeApi.getClient();
    const subscription = (await stripe.subscriptions.retrieve(
      stripeMeta.subscriptionId,
      { expand: ['items.data.price.product'] },
    )) as StripeSubscriptionObject;

    await this.syncService.applyStripeSubscriptionCreatedOrUpdated(
      subscription,
      {
        stripeEventId: `resync:${businessId}`,
        stripeEventType: 'admin.resync',
      },
      actor,
    );

    await this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          local.metadata,
          { lastSyncedAt: new Date().toISOString() },
        ),
      },
    });

    this.logger.log(`Resynced Stripe subscription for business ${businessId}`);

    return this.accessService.getAccess(businessId);
  }
}
