import { Injectable } from '@nestjs/common';
import {
  IntegrationResourceStatus,
  IntegrationResourceType,
  Prisma,
} from '@prisma/client';
import type { StripeConnectAccount } from '../stripe.types';
import { decryptIntegrationCredentials } from '../../../../common/utils/integration-encryption.util';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../repositories/integration-resource.repository';
import {
  mapStripeAccountStatus,
  maskStripeAccountId,
} from '../utils/stripe-account-status.util';
import { StripeApiService } from './stripe-api.service';

export type StripeIntegrationConfig = {
  stripeAccountId: string;
  livemode: boolean;
  scope?: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  defaultCurrency: string | null;
  country: string | null;
  readinessLabel: string;
  webhookStatus?: string;
};

@Injectable()
export class StripeAccountService {
  constructor(
    private readonly stripeApiService: StripeApiService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
  ) {}

  async findIntegrationByStripeAccountId(stripeAccountId: string) {
    const integrations =
      await this.businessIntegrationRepository.findManyByProviderKey('stripe');
    return (
      integrations.find((row) => {
        const config = row.config as Record<string, unknown> | null;
        return config?.stripeAccountId === stripeAccountId;
      }) ?? null
    );
  }

  async syncAccountForBusiness(
    businessId: string,
    actorUserId?: string,
  ): Promise<{ account: StripeConnectAccount; config: StripeIntegrationConfig }> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    if (!integration) {
      throw new Error('Stripe integration not found');
    }

    const config = integration.config as Record<string, unknown> | null;
    const stripeAccountId =
      typeof config?.stripeAccountId === 'string'
        ? config.stripeAccountId
        : null;
    if (!stripeAccountId) {
      throw new Error('Stripe account ID missing from integration');
    }

    const livemode =
      typeof config?.livemode === 'boolean' ? config.livemode : false;
    const account =
      await this.stripeApiService.retrieveConnectedAccount(stripeAccountId);

    await this.persistAccountSnapshot(
      integration.id,
      businessId,
      account,
      livemode,
      actorUserId,
    );

    const updated =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    const updatedConfig = updated!.config as StripeIntegrationConfig;

    return { account, config: updatedConfig };
  }

  async persistAccountSnapshot(
    businessIntegrationId: string,
    businessId: string,
    account: StripeConnectAccount,
    livemode: boolean,
    _actorUserId?: string,
  ): Promise<StripeIntegrationConfig> {
    const status = mapStripeAccountStatus(account, livemode);
    const stripeAccountId = account.id;
    const displayName =
      account.business_profile?.name ??
      account.settings?.dashboard?.display_name ??
      account.email ??
      maskStripeAccountId(stripeAccountId);

    const config: StripeIntegrationConfig = {
      stripeAccountId,
      livemode: status.livemode,
      scope: null,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      defaultCurrency: status.defaultCurrency,
      country: status.country,
      readinessLabel: status.readinessLabel,
      webhookStatus: 'endpoint configured',
    };

    const existing =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );

    const mergedConfig = {
      ...((existing?.config as Record<string, unknown> | null) ?? {}),
      ...config,
    };

    await this.businessIntegrationRepository.update(businessId, 'stripe', {
      status: status.integrationStatus,
      connectedAccountName: displayName,
      connectedAccountEmail: account.email ?? existing?.connectedAccountEmail,
      config: mergedConfig as Prisma.InputJsonValue,
      errorMessage: null,
      lastSyncAt: new Date(),
    });

    const now = new Date();
    await this.integrationResourceRepository.upsertMany(
      businessIntegrationId,
      businessId,
      'stripe',
      [
        {
          externalId: stripeAccountId,
          name: displayName,
          type: IntegrationResourceType.STRIPE_ACCOUNT,
          metadata: {
            stripeAccountId,
            maskedAccountId: maskStripeAccountId(stripeAccountId),
            chargesEnabled: status.chargesEnabled,
            payoutsEnabled: status.payoutsEnabled,
            detailsSubmitted: status.detailsSubmitted,
            defaultCurrency: status.defaultCurrency,
            country: status.country,
            livemode: status.livemode,
            readinessLabel: status.readinessLabel,
            modeLabel: status.livemode ? 'Live mode' : 'Test mode',
            dashboardDisplayName:
              account.settings?.dashboard?.display_name ?? null,
          } as Prisma.InputJsonValue,
          lastSyncedAt: now,
          isSelected: true,
          isDefault: true,
          status: status.resourceStatus,
        },
      ],
    );

    return config;
  }

  getEncryptionKey(): string {
    const key = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('Integration encryption key is not configured');
    }
    return key;
  }

  readStripeUserIdFromCredentials(
    credentials: Prisma.JsonValue | null,
  ): string | null {
    if (!credentials || typeof credentials !== 'object') return null;
    const encrypted = (credentials as { encrypted?: string }).encrypted;
    if (!encrypted) return null;
    try {
      const payload = decryptIntegrationCredentials(
        this.getEncryptionKey(),
        encrypted,
      ) as { stripeUserId?: string };
      return payload.stripeUserId ?? null;
    } catch {
      return null;
    }
  }
}
