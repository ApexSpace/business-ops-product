import { Injectable } from '@nestjs/common';
import {
  IntegrationResourceStatus,
  IntegrationResourceType,
} from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '../../../audit/constants/audit.constants';
import { AuditService } from '../../../audit/services/audit.service';
import { StripeAccountService } from '../../stripe/services/stripe-account.service';
import {
  IntegrationResourceSyncHandler,
  ResourceSyncContext,
  ResourceSyncResult,
} from './resource-sync.types';

@Injectable()
export class StripeResourceSyncHandler implements IntegrationResourceSyncHandler {
  readonly providerKey = 'stripe';

  constructor(
    private readonly stripeAccountService: StripeAccountService,
    private readonly auditService: AuditService,
  ) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const { account, config } =
      await this.stripeAccountService.syncAccountForBusiness(context.businessId);

    const displayName =
      account.business_profile?.name ??
      account.settings?.dashboard?.display_name ??
      account.email ??
      config.stripeAccountId;

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: context.businessId,
      action: 'stripe.account.synced',
      entityType: 'BusinessIntegration',
      entityId: context.businessIntegrationId,
      metadata: {
        stripeAccountId: config.stripeAccountId,
        readinessLabel: config.readinessLabel,
      },
    });

    return {
      synced: true,
      items: [
        {
          externalId: config.stripeAccountId,
          name: displayName,
          type: IntegrationResourceType.STRIPE_ACCOUNT,
          metadata: {
            stripeAccountId: config.stripeAccountId,
            chargesEnabled: config.chargesEnabled,
            payoutsEnabled: config.payoutsEnabled,
            detailsSubmitted: config.detailsSubmitted,
            defaultCurrency: config.defaultCurrency,
            country: config.country,
            livemode: config.livemode,
            readinessLabel: config.readinessLabel,
            modeLabel: config.livemode ? 'Live mode' : 'Test mode',
          },
          status:
            config.readinessLabel === 'Ready to accept payments'
              ? IntegrationResourceStatus.ACTIVE
              : IntegrationResourceStatus.INACTIVE,
        },
      ],
    };
  }
}
