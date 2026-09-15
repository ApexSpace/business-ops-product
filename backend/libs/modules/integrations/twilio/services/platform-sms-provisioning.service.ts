import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationResourceStatus,
  IntegrationResourceType,
  IntegrationStatus,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';
import { normalizeE164Phone } from '@app/core/config/twilio/twilio.config';
import {
  PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
  PLATFORM_SMS_METADATA_TYPE,
  PLATFORM_SMS_RESOURCE_EXTERNAL_ID,
  SMS_A2P_POOL_SHARED,
  SMS_PROVIDER_KEY,
} from '@app/modules/communications/sms/constants/sms-platform.constants';
import {
  isBusinessOwnedSmsResource,
  isPlatformProvisionedSmsResource,
  isPlatformSharedSmsResource,
  isPlatformSmsResource,
} from '@app/modules/communications/sms/utils/sms-channel.util';
import { resolveRequestedUsAreaCode } from '@app/modules/communications/sms/utils/us-phone-area-code.util';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessIntegrationRepository } from '../../integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../integrations/repositories/integration-resource.repository';
import { TwilioApiClient } from './twilio-api-client';

export interface PlatformSmsProvisioningResult {
  integrationId: string;
  resourceId: string;
  fromNumber: string;
  mode: 'platform';
  a2pPool?: 'SHARED' | 'OWNED';
  provisioned?: boolean;
}

@Injectable()
export class PlatformSmsProvisioningService {
  private readonly logger = new Logger(PlatformSmsProvisioningService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly businessRepository: BusinessRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly twilioApiClient: TwilioApiClient,
  ) {}

  /**
   * Ensure the business has a platform SMS sender.
   * US businesses: buy a local number (area-code match) and attach to shared A2P pool.
   * Non-US / buy unavailable: fall back to linking the shared env From number.
   * Never throws on the soft ensure path used at registration — returns null instead.
   */
  async ensurePlatformDefaultSms(
    businessId: string,
  ): Promise<PlatformSmsProvisioningResult | null> {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (!twilioConfig.enabled) {
      return null;
    }

    if (await this.hasBusinessOwnedSms(businessId)) {
      return null;
    }

    try {
      return await this.connectPlatformDefaultSms(businessId);
    } catch (error) {
      this.logger.warn(
        `Platform SMS auto-assign skipped for business ${businessId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    }
  }

  async connectPlatformDefaultSms(
    businessId: string,
  ): Promise<PlatformSmsProvisioningResult> {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (
      !twilioConfig.enabled ||
      !twilioConfig.accountSid ||
      !twilioConfig.authToken ||
      !twilioConfig.platformFromNumber
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Platform SMS is not configured. Enable TWILIO_ENABLED and set Twilio credentials.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (await this.hasBusinessOwnedSms(businessId)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'A business Twilio number is already connected for inbox SMS. Platform notification SMS does not replace that connection.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingResource =
      await this.integrationResourceRepository.findDefault(
        businessId,
        SMS_PROVIDER_KEY,
        IntegrationResourceType.PHONE_NUMBER,
      );

    if (existingResource && isPlatformProvisionedSmsResource(existingResource)) {
      const metadata = (existingResource.metadata ?? {}) as Record<
        string,
        unknown
      >;
      const fromNumber =
        typeof metadata.fromNumber === 'string'
          ? metadata.fromNumber
          : existingResource.externalId;
      return {
        integrationId: existingResource.businessIntegrationId,
        resourceId: existingResource.id,
        fromNumber: normalizeE164Phone(fromNumber),
        mode: 'platform',
        a2pPool: SMS_A2P_POOL_SHARED,
        provisioned: true,
      };
    }

    if (existingResource && isPlatformSharedSmsResource(existingResource)) {
      // Already on legacy shared env number — try upgrade to provisioned when US.
      const upgraded = await this.tryProvisionUsLocalNumber(business);
      if (upgraded) {
        return upgraded;
      }
      return {
        integrationId: existingResource.businessIntegrationId,
        resourceId: existingResource.id,
        fromNumber: normalizeE164Phone(twilioConfig.platformFromNumber),
        mode: 'platform',
        provisioned: false,
      };
    }

    const provisioned = await this.tryProvisionUsLocalNumber(business);
    if (provisioned) {
      return provisioned;
    }

    return this.connectSharedEnvFallback(business.id, business.name);
  }

  private async tryProvisionUsLocalNumber(business: {
    id: string;
    name: string;
    phoneCountryCode: string | null;
    phoneNumber: string | null;
  }): Promise<PlatformSmsProvisioningResult | null> {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (!twilioConfig.accountSid || !twilioConfig.authToken) {
      return null;
    }

    if (twilioConfig.autoPurchaseNumbers === false) {
      this.logger.log(
        `Skipping Twilio number purchase for business ${business.id} (TWILIO_AUTO_PURCHASE_NUMBERS=false)`,
      );
      return null;
    }

    const { isUs, areaCode } = resolveRequestedUsAreaCode({
      phoneCountryCode: business.phoneCountryCode,
      phoneNumber: business.phoneNumber,
      defaultAreaCode: twilioConfig.defaultAreaCode,
    });

    if (!isUs) {
      return null;
    }

    const accountSid = twilioConfig.accountSid;
    const authToken = twilioConfig.authToken;
    const inboundUrl = this.twilioApiClient.buildInboundWebhookUrl();

    let available = await this.twilioApiClient.searchAvailableUsLocalNumbers({
      accountSid,
      authToken,
      areaCode,
      limit: 10,
    });

    let usedAreaCode = areaCode;
    if (!available.length && areaCode) {
      this.logger.warn(
        `No Twilio US local inventory for area code ${areaCode}; falling back to any US local`,
      );
      available = await this.twilioApiClient.searchAvailableUsLocalNumbers({
        accountSid,
        authToken,
        areaCode: null,
        limit: 10,
      });
      usedAreaCode = null;
    }

    if (!available.length) {
      this.logger.warn('No Twilio US local SMS numbers available to purchase');
      return null;
    }

    const selected = available[0]!;
    const purchased = await this.twilioApiClient.purchasePhoneNumber({
      accountSid,
      authToken,
      phoneNumber: selected.phoneNumber,
      smsUrl: inboundUrl,
      friendlyName: `${business.name} (PandaCue SMS)`.slice(0, 64),
    });

    const fromNumber = normalizeE164Phone(purchased.phoneNumber);
    const assignedAreaCode = extractAreaCodeFromE164(fromNumber);

    if (twilioConfig.messagingServiceSid) {
      try {
        await this.twilioApiClient.addPhoneNumberToMessagingService({
          accountSid,
          authToken,
          messagingServiceSid: twilioConfig.messagingServiceSid,
          phoneNumberSid: purchased.sid,
        });
      } catch (error) {
        this.logger.error(
          `Failed to add ${fromNumber} to Messaging Service ${twilioConfig.messagingServiceSid}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    } else {
      this.logger.warn(
        'TWILIO_SHARED_MESSAGING_SERVICE_SID is not set; number purchased but not added to A2P sender pool',
      );
    }

    if (inboundUrl) {
      try {
        await this.twilioApiClient.configureIncomingSmsWebhook(
          accountSid,
          authToken,
          purchased.sid,
          inboundUrl,
        );
      } catch {
        // Purchase may have already set smsUrl; ignore secondary configure failures.
      }
    }

    return this.persistProvisionedResource({
      businessId: business.id,
      businessName: business.name,
      fromNumber,
      phoneNumberSid: purchased.sid,
      messagingServiceSid: twilioConfig.messagingServiceSid,
      requestedAreaCode: areaCode,
      assignedAreaCode: assignedAreaCode ?? usedAreaCode,
    });
  }

  private async persistProvisionedResource(params: {
    businessId: string;
    businessName: string;
    fromNumber: string;
    phoneNumberSid: string;
    messagingServiceSid: string | null;
    requestedAreaCode: string | null;
    assignedAreaCode: string | null;
  }): Promise<PlatformSmsProvisioningResult> {
    const integration = await this.businessIntegrationRepository.upsert(
      params.businessId,
      SMS_PROVIDER_KEY,
      {
        status: IntegrationStatus.CONNECTED,
        config: {
          mode: PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
          a2pPool: SMS_A2P_POOL_SHARED,
          twoWayEnabled: false,
          messagingServiceSid: params.messagingServiceSid,
        },
        credentials: Prisma.DbNull,
        connectedAccountName: `${params.businessName} (PandaCue SMS)`,
        connectedAccountEmail: null,
        connectedAt: new Date(),
        errorMessage: null,
      },
    );

    await this.integrationResourceRepository.clearDefaultForType(
      integration.id,
      IntegrationResourceType.PHONE_NUMBER,
    );

    const metadata = {
      type: PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
      a2pPool: SMS_A2P_POOL_SHARED,
      fromNumber: params.fromNumber,
      phoneNumberSid: params.phoneNumberSid,
      messagingServiceSid: params.messagingServiceSid,
      requestedAreaCode: params.requestedAreaCode,
      assignedAreaCode: params.assignedAreaCode,
      twoWayEnabled: false,
      country: 'US',
    } satisfies Record<string, string | boolean | null>;

    const [resource] = await this.integrationResourceRepository.upsertMany(
      integration.id,
      params.businessId,
      SMS_PROVIDER_KEY,
      [
        {
          externalId: params.fromNumber,
          name: `${params.businessName} (PandaCue SMS)`,
          type: IntegrationResourceType.PHONE_NUMBER,
          metadata,
          status: IntegrationResourceStatus.ACTIVE,
          isSelected: true,
          isDefault: true,
          lastSyncedAt: new Date(),
        },
      ],
    );

    return {
      integrationId: integration.id,
      resourceId: resource.id,
      fromNumber: params.fromNumber,
      mode: 'platform',
      a2pPool: SMS_A2P_POOL_SHARED,
      provisioned: true,
    };
  }

  private async connectSharedEnvFallback(
    businessId: string,
    businessName: string,
  ): Promise<PlatformSmsProvisioningResult> {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    const fromNumber = normalizeE164Phone(twilioConfig.platformFromNumber!);

    const existingResource =
      await this.integrationResourceRepository.findDefault(
        businessId,
        SMS_PROVIDER_KEY,
        IntegrationResourceType.PHONE_NUMBER,
      );
    if (existingResource && isPlatformSmsResource(existingResource)) {
      return {
        integrationId: existingResource.businessIntegrationId,
        resourceId: existingResource.id,
        fromNumber,
        mode: 'platform',
        provisioned: false,
      };
    }

    const integration = await this.businessIntegrationRepository.upsert(
      businessId,
      SMS_PROVIDER_KEY,
      {
        status: IntegrationStatus.CONNECTED,
        config: {
          mode: PLATFORM_SMS_METADATA_TYPE,
          twoWayEnabled: false,
        },
        credentials: Prisma.DbNull,
        connectedAccountName: `${businessName} (PandaCue SMS)`,
        connectedAccountEmail: null,
        connectedAt: new Date(),
        errorMessage: null,
      },
    );

    const metadata = {
      type: PLATFORM_SMS_METADATA_TYPE,
      fromNumber,
      twoWayEnabled: false,
    } satisfies Record<string, string | boolean>;

    const [resource] = await this.integrationResourceRepository.upsertMany(
      integration.id,
      businessId,
      SMS_PROVIDER_KEY,
      [
        {
          externalId: PLATFORM_SMS_RESOURCE_EXTERNAL_ID,
          name: `${businessName} (PandaCue SMS)`,
          type: IntegrationResourceType.PHONE_NUMBER,
          metadata,
          status: IntegrationResourceStatus.ACTIVE,
          isSelected: true,
          isDefault: true,
          lastSyncedAt: new Date(),
        },
      ],
    );

    return {
      integrationId: integration.id,
      resourceId: resource.id,
      fromNumber,
      mode: 'platform',
      provisioned: false,
    };
  }

  private async hasBusinessOwnedSms(businessId: string): Promise<boolean> {
    const resources =
      await this.integrationResourceRepository.findManyByBusinessAndProvider(
        businessId,
        SMS_PROVIDER_KEY,
      );
    return resources.some((resource) => isBusinessOwnedSmsResource(resource));
  }
}

function extractAreaCodeFromE164(e164: string): string | null {
  const digits = e164.replace(/\D/g, '');
  const national =
    digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return null;
  return national.slice(0, 3);
}
