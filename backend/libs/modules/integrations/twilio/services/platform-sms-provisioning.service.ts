import { HttpStatus, Injectable } from '@nestjs/common';
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
  PLATFORM_SMS_METADATA_TYPE,
  PLATFORM_SMS_RESOURCE_EXTERNAL_ID,
  SMS_PROVIDER_KEY,
} from '@app/modules/communications/sms/constants/sms-platform.constants';
import {
  isBusinessOwnedSmsResource,
  isPlatformSmsResource,
} from '@app/modules/communications/sms/utils/sms-channel.util';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessIntegrationRepository } from '../../integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../integrations/repositories/integration-resource.repository';

export interface PlatformSmsProvisioningResult {
  integrationId: string;
  resourceId: string;
  fromNumber: string;
  mode: 'platform';
}

@Injectable()
export class PlatformSmsProvisioningService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly businessRepository: BusinessRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
  ) {}

  async ensurePlatformDefaultSms(
    businessId: string,
  ): Promise<PlatformSmsProvisioningResult | null> {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (!twilioConfig.enabled) {
      return null;
    }

    // Business Twilio owns the SMS integration for two-way inbox. Platform
    // notification sends use env credentials directly and must never wipe it.
    if (await this.hasBusinessOwnedSms(businessId)) {
      return null;
    }

    return this.connectPlatformDefaultSms(businessId);
  }

  async connectPlatformDefaultSms(
    businessId: string,
  ): Promise<PlatformSmsProvisioningResult> {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (!twilioConfig.enabled || !twilioConfig.platformFromNumber) {
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
        'A business Twilio number is already connected for inbox SMS. Platform notification SMS uses server env credentials and does not replace that connection.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fromNumber = normalizeE164Phone(twilioConfig.platformFromNumber);

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
        connectedAccountName: `${business.name} (CodeSol SMS)`,
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
          name: `${business.name} (CodeSol SMS)`,
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
