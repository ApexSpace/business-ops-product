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
  isPlatformProvisionedSmsResource,
  isPlatformSmsResource,
  isTwoWayEnabledSmsResource,
  readSmsResourceFromNumber,
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
  /** Present for provisioned / connected numbers; null for bare env fallback. */
  resource: IntegrationResource | null;
  twoWayEnabled: boolean;
  messagingServiceSid?: string | null;
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
   * Env-only platform fallback (shared TWILIO_PLATFORM_FROM_NUMBER).
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
      messagingServiceSid: twilioConfig.messagingServiceSid,
    };
  }

  /**
   * Notification SMS for a business: prefer auto-assigned PLATFORM_PROVISIONED
   * From number; otherwise env platform From.
   */
  async resolveNotificationForBusiness(
    businessId: string,
  ): Promise<ResolvedSmsContext | null> {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (
      !twilioConfig.enabled ||
      !twilioConfig.accountSid ||
      !twilioConfig.authToken
    ) {
      return null;
    }

    const resource = await this.integrationResourceRepository.findDefault(
      businessId,
      SMS_PROVIDER_KEY,
      IntegrationResourceType.PHONE_NUMBER,
    );

    if (resource && isPlatformProvisionedSmsResource(resource)) {
      const fromNumber = readSmsResourceFromNumber(
        resource,
        twilioConfig.platformFromNumber,
      );
      if (fromNumber) {
        const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
        return {
          mode: 'platform',
          accountSid: twilioConfig.accountSid,
          authToken: twilioConfig.authToken,
          fromNumber,
          resource,
          twoWayEnabled: false,
          messagingServiceSid:
            (typeof metadata.messagingServiceSid === 'string'
              ? metadata.messagingServiceSid
              : null) ?? twilioConfig.messagingServiceSid,
        };
      }
    }

    if (resource && isPlatformSmsResource(resource)) {
      const platform = this.resolvePlatformNotification();
      if (!platform) return null;
      return { ...platform, resource };
    }

    return this.resolvePlatformNotification();
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

    const businessOwned = await this.resolveBusinessOwned(businessId);
    if (businessOwned) {
      return businessOwned;
    }

    return this.resolveNotificationForBusiness(businessId);
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
      const fromNumber = readSmsResourceFromNumber(resource, null);
      if (!fromNumber) return null;
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
   */
  async isBusinessOwnedFromNumber(fromNumber: string): Promise<boolean> {
    const resource = await this.findActivePhoneResourceByTo(fromNumber);
    return isBusinessOwnedSmsResource(resource);
  }

  /**
   * Env shared From OR any PLATFORM_PROVISIONED / PLATFORM_SHARED resource matching To.
   * Used for compliance-only inbound when two-way is off.
   */
  async isOneWayNotificationNumber(toNumber: string): Promise<boolean> {
    if (this.isPlatformNumber(toNumber)) {
      const owned = await this.isBusinessOwnedFromNumber(toNumber);
      return !owned;
    }

    const resource = await this.findActivePhoneResourceByTo(toNumber);
    if (!resource) return false;
    if (isBusinessOwnedSmsResource(resource)) return false;
    if (isPlatformProvisionedSmsResource(resource)) {
      return !isTwoWayEnabledSmsResource(resource);
    }
    return isPlatformSmsResource(resource);
  }

  /** @deprecated Alias — prefer isOneWayNotificationNumber */
  async isOneWayPlatformInboundNumber(toNumber: string): Promise<boolean> {
    return this.isOneWayNotificationNumber(toNumber);
  }

  async findActivePhoneResourceByTo(
    toNumber: string,
  ): Promise<IntegrationResource | null> {
    const normalized = normalizeE164Phone(toNumber);
    if (!normalized) return null;
    return this.integrationResourceRepository.findActiveByExternalId(
      normalized,
      SMS_PROVIDER_KEY,
      IntegrationResourceType.PHONE_NUMBER,
    );
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
