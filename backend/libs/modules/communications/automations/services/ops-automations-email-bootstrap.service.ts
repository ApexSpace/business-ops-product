import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformEmailProvisioningService } from '@app/modules/integrations/integrations/email/services/platform-email-provisioning.service';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';

/**
 * Idempotently provisions the platform shared email mailbox on the INTERNAL ops tenant
 * so `send_internal_email` automations have a sender identity.
 */
@Injectable()
export class OpsAutomationsEmailBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(OpsAutomationsEmailBootstrapService.name);

  constructor(
    private readonly internalBusiness: InternalBusinessService,
    private readonly platformEmailProvisioning: PlatformEmailProvisioningService,
  ) {}

  async onModuleInit() {
    try {
      const opsBusinessId = await this.internalBusiness.getId();
      const result =
        await this.platformEmailProvisioning.ensurePlatformDefaultEmail(
          opsBusinessId,
        );
      if (result) {
        this.logger.log(
          `Ops platform email ready: ${result.fromAddress} (${result.fromName})`,
        );
      } else {
        this.logger.warn(
          'Ops platform email not provisioned (EMAIL_ENABLED / RESEND_API_KEY missing)',
        );
      }
    } catch (error) {
      this.logger.warn(
        `Ops platform email bootstrap skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
