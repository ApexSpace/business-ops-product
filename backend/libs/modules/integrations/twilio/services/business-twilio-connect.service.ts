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
  BUSINESS_SMS_METADATA_TYPE,
  SMS_PROVIDER_KEY,
} from '@app/modules/communications/sms/constants/sms-platform.constants';
import { BusinessIntegrationRepository } from '../../integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../integrations/repositories/integration-resource.repository';
import { TwilioApiClient } from './twilio-api-client';
import { TwilioCredentialsService } from './twilio-credentials.service';

export interface ConnectBusinessTwilioInput {
  accountSid: string;
  authToken: string;
  phoneNumberSid: string;
}

export interface BusinessTwilioConnectResult {
  integrationId: string;
  resourceId: string;
  fromNumber: string;
  mode: 'business';
}

@Injectable()
export class BusinessTwilioConnectService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly twilioApiClient: TwilioApiClient,
    private readonly twilioCredentialsService: TwilioCredentialsService,
  ) {}

  async connectBusinessTwilio(
    businessId: string,
    dto: ConnectBusinessTwilioInput,
  ): Promise<BusinessTwilioConnectResult> {
    const accountSid = dto.accountSid.trim();
    const authToken = dto.authToken.trim();
    const phoneNumberSid = dto.phoneNumberSid.trim();

    await this.twilioApiClient.validateCredentials(accountSid, authToken);
    const numbers = await this.twilioApiClient.listSmsPhoneNumbers(
      accountSid,
      authToken,
    );
    const selected = numbers.find((n) => n.sid === phoneNumberSid);
    if (!selected) {
      throw new AppException(
        ErrorCode.INTEGRATION_RESOURCE_NOT_FOUND,
        'Selected Twilio phone number was not found on this account',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fromNumber = normalizeE164Phone(selected.phoneNumber);
    const encrypted = this.twilioCredentialsService.encrypt({
      accountSid,
      authToken,
    });

    const integration = await this.businessIntegrationRepository.upsert(
      businessId,
      SMS_PROVIDER_KEY,
      {
        status: IntegrationStatus.CONNECTED,
        config: {
          mode: BUSINESS_SMS_METADATA_TYPE,
          twoWayEnabled: true,
          accountSid,
        },
        credentials: encrypted as unknown as Prisma.InputJsonValue,
        connectedAccountName: selected.friendlyName || fromNumber,
        connectedAccountEmail: null,
        connectedAt: new Date(),
        errorMessage: null,
      },
    );

    const metadata = {
      type: BUSINESS_SMS_METADATA_TYPE,
      fromNumber,
      phoneNumberSid: selected.sid,
      accountSid,
      twoWayEnabled: true,
    } satisfies Record<string, string | boolean>;

    const [resource] = await this.integrationResourceRepository.upsertMany(
      integration.id,
      businessId,
      SMS_PROVIDER_KEY,
      [
        {
          externalId: fromNumber,
          name: selected.friendlyName || fromNumber,
          type: IntegrationResourceType.PHONE_NUMBER,
          metadata,
          status: IntegrationResourceStatus.ACTIVE,
          isSelected: true,
          isDefault: true,
          lastSyncedAt: new Date(),
        },
      ],
    );

    await this.integrationResourceRepository.clearDefaultForType(
      integration.id,
      IntegrationResourceType.PHONE_NUMBER,
      resource.id,
    );

    const inboundUrl = this.twilioApiClient.buildInboundWebhookUrl();
    if (inboundUrl) {
      await this.twilioApiClient
        .configureIncomingSmsWebhook(
          accountSid,
          authToken,
          selected.sid,
          inboundUrl,
        )
        .catch(() => undefined);
    }

    return {
      integrationId: integration.id,
      resourceId: resource.id,
      fromNumber,
      mode: 'business',
    };
  }

  async listAvailablePhoneNumbers(
    accountSid: string,
    authToken: string,
  ) {
    // Listing authenticates the request and maps auth errors itself, so a
    // separate validateCredentials round-trip only doubles latency.
    return this.twilioApiClient.listSmsPhoneNumbers(
      accountSid.trim(),
      authToken.trim(),
    );
  }
}
