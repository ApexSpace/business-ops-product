import { Module } from '@nestjs/common';
import { TwilioApiClient } from './services/twilio-api-client';
import { TwilioCredentialsService } from './services/twilio-credentials.service';
import { PlatformSmsProvisioningService } from './services/platform-sms-provisioning.service';
import { BusinessTwilioConnectService } from './services/business-twilio-connect.service';
import { SmsModeResolverService } from './services/sms-mode-resolver.service';
import { BusinessIntegrationRepository } from '../integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../integrations/repositories/integration-resource.repository';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';

@Module({
  providers: [
    TwilioApiClient,
    TwilioCredentialsService,
    PlatformSmsProvisioningService,
    BusinessTwilioConnectService,
    SmsModeResolverService,
    BusinessIntegrationRepository,
    IntegrationResourceRepository,
    BusinessRepository,
  ],
  exports: [
    TwilioApiClient,
    TwilioCredentialsService,
    PlatformSmsProvisioningService,
    BusinessTwilioConnectService,
    SmsModeResolverService,
    BusinessIntegrationRepository,
  ],
})
export class TwilioModule {}
