import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { PlatformEmailProvisioningService } from '@app/modules/integrations/integrations/email/services/platform-email-provisioning.service';
import { WhatsAppEmbeddedSignupCompleteDto } from '@app/modules/integrations/integrations/meta/dto/whatsapp-embedded-signup.dto';
import { MetaEmbeddedSignupService } from '@app/modules/integrations/integrations/meta/services/meta-embedded-signup.service';
import { MetaOAuthService } from '@app/modules/integrations/integrations/meta/services/meta-oauth.service';
import { IntegrationsService } from '@app/modules/integrations/integrations/integrations.service';
import { MessagingStatusService } from '@app/modules/integrations/integrations/services/messaging-status.service';
import { PlatformSmsProvisioningService } from '@app/modules/integrations/twilio/services/platform-sms-provisioning.service';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';

const PLATFORM_OPS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

const MESSAGING_PROVIDER_KEYS = [
  'facebook',
  'instagram',
  'whatsapp',
  'sms',
  'email',
] as const;

@ApiTags('platform-ops-messaging')
@ApiBearerAuth()
@Controller('platform/integrations')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_OPS_ROLES)
export class PlatformOpsMessagingController {
  constructor(
    private readonly internalBusiness: InternalBusinessService,
    private readonly integrationsService: IntegrationsService,
    private readonly messagingStatusService: MessagingStatusService,
    private readonly metaOAuthService: MetaOAuthService,
    private readonly metaEmbeddedSignupService: MetaEmbeddedSignupService,
    private readonly platformSmsProvisioning: PlatformSmsProvisioningService,
    private readonly platformEmailProvisioning: PlatformEmailProvisioningService,
  ) {}

  /** INTERNAL ops messaging channels + readiness for the unified inbox. */
  @Get('messaging')
  async listMessagingChannels() {
    const businessId = await this.internalBusiness.getId();
    const integrations =
      await this.integrationsService.listBusinessIntegrations(businessId);

    const channels = await Promise.all(
      MESSAGING_PROVIDER_KEYS.map(async (providerKey) => {
        const integration =
          integrations.find((row) => row.providerKey === providerKey) ?? null;
        const messagingStatus =
          await this.messagingStatusService.getMessagingStatus(
            businessId,
            providerKey,
          );
        return {
          providerKey,
          integration,
          messagingStatus,
        };
      }),
    );

    return { businessId, channels };
  }

  @Get('messaging/:providerKey/status')
  async getMessagingStatus(@Param('providerKey') providerKey: string) {
    const businessId = await this.internalBusiness.getId();
    return this.messagingStatusService.getMessagingStatus(
      businessId,
      providerKey,
    );
  }

  @Get('oauth/meta/client-config')
  getMetaClientConfig() {
    return this.metaOAuthService.getClientConfig();
  }

  @Get('oauth/meta/start')
  @SkipEnvelope()
  async startMetaOAuth(
    @CurrentUser() user: RequestUser,
    @Query('providerKey') providerKey: string,
    @Res() res: Response,
  ): Promise<void> {
    const businessId = await this.internalBusiness.getId();
    await this.metaOAuthService.redirectToMetaForBusiness(
      user,
      businessId,
      providerKey,
      res,
    );
  }

  @Get('oauth/meta/whatsapp/start')
  @SkipEnvelope()
  async startWhatsAppSignup(
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ): Promise<void> {
    const businessId = await this.internalBusiness.getId();
    await this.metaEmbeddedSignupService.redirectToWhatsAppSignupForBusiness(
      user,
      businessId,
      res,
    );
  }

  @Post('oauth/meta/whatsapp/embedded-signup/complete')
  async completeWhatsAppEmbeddedSignup(
    @CurrentUser() user: RequestUser,
    @Body() dto: WhatsAppEmbeddedSignupCompleteDto,
  ): Promise<{ success: true }> {
    const businessId = await this.internalBusiness.getId();
    await this.metaEmbeddedSignupService.completeEmbeddedSignup(
      businessId,
      user.id,
      dto,
    );
    return { success: true };
  }

  @Post('messaging/sms/connect')
  async connectSms() {
    const businessId = await this.internalBusiness.getId();
    return this.platformSmsProvisioning.connectPlatformDefaultSms(businessId);
  }

  @Post('messaging/email/connect')
  async connectEmail() {
    const businessId = await this.internalBusiness.getId();
    return this.platformEmailProvisioning.connectPlatformDefaultEmail(
      businessId,
    );
  }
}
