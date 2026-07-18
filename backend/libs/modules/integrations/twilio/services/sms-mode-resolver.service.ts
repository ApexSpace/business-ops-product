import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationResource,
  IntegrationResourceType,
  IntegrationStatus,
} from '@prisma/client';
import type { RootConfig } from '@app/core/config/configuration';
import { SMS_PROVIDER_KEY } from '@app/modules/communications/sms/constants/sms-platform.constants';
import {
  isBusinessOwnedSmsResource,
  isPlatformSmsResource,
  SmsSendMode,
} from '@app/modules/communications/sms/utils/sms-channel.util';
import { normalizeE164Phone } from '@app/core/config/twilio/twilio.config';
import { BusinessIntegrationRepository } from '../../integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../integrations/repositories/integration-resource.repository';
import { TwilioCredentialsService } from './twilio-credentials.service';

export interface ResolvedSmsContext {
  mode: SmsSendMode;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  /** Present for inbox / connected numbers; null for env-based platform notifications. */
  resource: IntegrationResource | null;
  twoWayEnabled: boolean;
}

@Injectable()
export class SmsModeResolverService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly twilioCredentialsService: TwilioCredentialsService,
  ) {}

  /**
   * Outbound notification SMS (Express Booking, automations, etc.).
   * Always uses the platform Twilio number from env when enabled —
   * no per-business SMS integration is required.
   */
  resolvePlatformNotification(): ResolvedSmsContext | null {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (
      !twilioConfig.enabled ||
      !twilioConfig.accountSid ||
      !twilioConfig.authToken ||
      !twilioConfig.platformFromNumber
    ) {
      return null;
    }

    return {
      mode: 'platform',
      accountSid: twilioConfig.accountSid,
      authToken: twilioConfig.authToken,
      fromNumber: twilioConfig.platformFromNumber,
      resource: null,
      twoWayEnabled: false,
    };
  }

  /**
   * Resolves SMS send context for a business (inbox / two-way or explicit resource).
   * Falls back to platform env credentials when no business SMS resource exists.
   */
  async resolveForBusiness(
    businessId: string,
    resourceId?: string,
  ): Promise<ResolvedSmsContext | null> {
    const resource = resourceId
      ? await this.integrationResourceRepository.findByIdAndBusiness(
          resourceId,
          businessId,
        )
      : await this.integrationResourceRepository.findDefault(
          businessId,
          SMS_PROVIDER_KEY,
          IntegrationResourceType.PHONE_NUMBER,
        );

    if (resource && resource.providerKey === SMS_PROVIDER_KEY) {
      const businessContext = await this.resolveBusinessOwnedFromResource(
        businessId,
        resource,
      );
      if (businessContext) {
        return businessContext;
      }
    }

    // Conversation may still point at a stale platform resource after Twilio
    // was connected — prefer an active business-owned number for inbox sends.
    const businessOwned = await this.resolveBusinessOwned(businessId);
    if (businessOwned) {
      return businessOwned;
    }

    if (resource && isPlatformSmsResource(resource)) {
      const platform = this.resolvePlatformNotification();
      if (!platform) return null;
      return { ...platform, resource };
    }

    return this.resolvePlatformNotification();
  }

  /**
   * Two-way inbox SMS only — never falls back to the platform notification number.
   */
  async resolveBusinessOwned(
    businessId: string,
  ): Promise<ResolvedSmsContext | null> {
    const resources =
      await this.integrationResourceRepository.findManyByBusinessAndProvider(
        businessId,
        SMS_PROVIDER_KEY,
      );
    const owned =
      resources.find(
        (resource) =>
          isBusinessOwnedSmsResource(resource) && resource.isDefault,
      ) ?? resources.find((resource) => isBusinessOwnedSmsResource(resource));

    if (!owned) {
      return null;
    }

    return this.resolveBusinessOwnedFromResource(businessId, owned);
  }

  private async resolveBusinessOwnedFromResource(
    businessId: string,
    resource: IntegrationResource,
  ): Promise<ResolvedSmsContext | null> {
    if (!isBusinessOwnedSmsResource(resource)) {
      return null;
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        SMS_PROVIDER_KEY,
      );
    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      return null;
    }

    try {
      const creds = this.twilioCredentialsService.decrypt(
        integration.credentials,
      );
      const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
      const fromNumber =
        typeof metadata.fromNumber === 'string'
          ? metadata.fromNumber
          : resource.externalId;
      return {
        mode: 'business',
        accountSid: creds.accountSid,
        authToken: creds.authToken,
        fromNumber,
        resource,
        twoWayEnabled: true,
      };
    } catch {
      return null;
    }
  }

  /**
   * True when a business has connected this E.164 as their two-way inbox number.
   * Used so the shared platform number can still receive inbox SMS during testing.
   */
  async isBusinessOwnedFromNumber(fromNumber: string): Promise<boolean> {
    const normalized = normalizeE164Phone(fromNumber);
    if (!normalized) return false;

    const resource =
      await this.integrationResourceRepository.findActiveByExternalId(
        normalized,
        SMS_PROVIDER_KEY,
        IntegrationResourceType.PHONE_NUMBER,
      );
    return isBusinessOwnedSmsResource(resource);
  }

  isPlatformNumber(toNumber: string): boolean {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (!twilioConfig.platformFromNumber) return false;
    const normalizedTo = toNumber.replace(/\D/g, '');
    const normalizedPlatform = twilioConfig.platformFromNumber.replace(
      /\D/g,
      '',
    );
    return normalizedTo === normalizedPlatform;
  }
}
