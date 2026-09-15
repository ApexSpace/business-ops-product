import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import type { Response } from 'express';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { buildJobOnlyAcceptedResponse } from '@app/common/utils/async-job-response.util';
import { PlatformEmailProvisioningService } from '@app/modules/integrations/integrations/email/services/platform-email-provisioning.service';
import { WhatsAppEmbeddedSignupCompleteDto } from '@app/modules/integrations/integrations/meta/dto/whatsapp-embedded-signup.dto';
import { MetaEmbeddedSignupService } from '@app/modules/integrations/integrations/meta/services/meta-embedded-signup.service';
import { MetaOAuthService } from '@app/modules/integrations/integrations/meta/services/meta-oauth.service';
import { GoogleOAuthService } from '@app/modules/integrations/integrations/google-oauth.service';
import {
  IntegrationResourceResponseDto,
  IntegrationResourcesListResponseDto,
  UpdateIntegrationResourceDto,
} from '@app/modules/integrations/integrations/dto/integration-resource.dto';
import { IntegrationsService } from '@app/modules/integrations/integrations/integrations.service';
import { IntegrationResourcesService } from '@app/modules/integrations/integrations/services/integration-resources.service';
import { MessagingStatusService } from '@app/modules/integrations/integrations/services/messaging-status.service';
import { PlatformSmsProvisioningService } from '@app/modules/integrations/twilio/services/platform-sms-provisioning.service';
import { BusinessTwilioConnectService } from '@app/modules/integrations/twilio/services/business-twilio-connect.service';
import { TwilioApiClient } from '@app/modules/integrations/twilio/services/twilio-api-client';
import {
  ConnectBusinessTwilioDto,
  ListTwilioPhoneNumbersDto,
} from '@app/modules/integrations/twilio/dto/connect-business-twilio.dto';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';

const PLATFORM_OPS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

/**
 * Platform-admin messaging/integrations for the INTERNAL ops workspace.
 * Uses PlatformRolesGuard + InternalBusinessService — never BusinessRolesGuard —
 * so tenant business JWT/context is not required and business routes stay untouched.
 */
@ApiTags('platform-ops-messaging')
@ApiBearerAuth()
@Controller('platform/integrations')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_OPS_ROLES)
export class PlatformOpsMessagingController {
  constructor(
    private readonly internalBusiness: InternalBusinessService,
    private readonly integrationsService: IntegrationsService,
    private readonly integrationResourcesService: IntegrationResourcesService,
    private readonly messagingStatusService: MessagingStatusService,
    private readonly metaOAuthService: MetaOAuthService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly metaEmbeddedSignupService: MetaEmbeddedSignupService,
    private readonly platformSmsProvisioning: PlatformSmsProvisioningService,
    private readonly platformEmailProvisioning: PlatformEmailProvisioningService,
    private readonly businessTwilioConnect: BusinessTwilioConnectService,
    private readonly twilioApiClient: TwilioApiClient,
  ) {}

  /**
   * Same catalog as business Integrations, plus platform-only providers.
   * Multi-segment path avoids collision with `:providerKey` on
   * PlatformIntegrationsController.
   */
  @Get('ops/providers')
  async listWorkspaceProviders() {
    const businessId = await this.internalBusiness.getId();
    return this.integrationsService.listOpsWorkspaceProviders(businessId);
  }

  @Get('ops/:providerKey/resources')
  async listWorkspaceResources(
    @Param('providerKey') providerKey: string,
  ): Promise<IntegrationResourcesListResponseDto> {
    const businessId = await this.internalBusiness.getId();
    return this.integrationResourcesService.listResources(
      businessId,
      providerKey,
    );
  }

  @Post('ops/:providerKey/resources/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async syncWorkspaceResources(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    const { asyncJob } =
      await this.integrationResourcesService.enqueueSyncResources(
        businessId,
        providerKey,
        user.id,
        idempotencyKey,
      );
    return buildJobOnlyAcceptedResponse(asyncJob, businessId);
  }

  @Patch('ops/:providerKey/resources/:resourceId')
  async updateWorkspaceResource(
    @Param('providerKey') providerKey: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateIntegrationResourceDto,
  ): Promise<IntegrationResourceResponseDto> {
    const businessId = await this.internalBusiness.getId();
    return this.integrationResourcesService.updateResource(
      businessId,
      providerKey,
      resourceId,
      dto,
    );
  }

  @Post('ops/:providerKey/resources/:resourceId/select')
  async selectWorkspaceResource(
    @Param('providerKey') providerKey: string,
    @Param('resourceId') resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    const businessId = await this.internalBusiness.getId();
    return this.integrationResourcesService.selectResource(
      businessId,
      providerKey,
      resourceId,
    );
  }

  @Post('ops/:providerKey/resources/:resourceId/unselect')
  async unselectWorkspaceResource(
    @Param('providerKey') providerKey: string,
    @Param('resourceId') resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    const businessId = await this.internalBusiness.getId();
    return this.integrationResourcesService.unselectResource(
      businessId,
      providerKey,
      resourceId,
    );
  }

  @Post('ops/:providerKey/resources/:resourceId/make-default')
  async makeDefaultWorkspaceResource(
    @Param('providerKey') providerKey: string,
    @Param('resourceId') resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    const businessId = await this.internalBusiness.getId();
    return this.integrationResourcesService.makeDefaultResource(
      businessId,
      providerKey,
      resourceId,
    );
  }

  @Get('ops/:providerKey')
  async getWorkspaceIntegration(@Param('providerKey') providerKey: string) {
    const businessId = await this.internalBusiness.getId();
    return this.integrationsService.getBusinessIntegration(
      businessId,
      providerKey,
    );
  }

  @Delete('ops/:providerKey')
  async disconnectWorkspaceIntegration(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    await this.integrationsService.deleteBusinessIntegration(
      businessId,
      providerKey,
      user,
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
    @Query('authFlow') authFlow: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const businessId = await this.internalBusiness.getId();
    await this.metaOAuthService.redirectToMetaForBusiness(
      user,
      businessId,
      providerKey,
      res,
      authFlow,
    );
  }

  @Get('oauth/google/start')
  @SkipEnvelope()
  async startGoogleOAuth(
    @CurrentUser() user: RequestUser,
    @Query('providerKey') providerKey: string,
    @Res() res: Response,
  ): Promise<void> {
    const businessId = await this.internalBusiness.getId();
    await this.googleOAuthService.redirectToGoogleForBusiness(
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

  // ── Ops SMS (INTERNAL business; platform auth only) ─────────────────

  @Get('messaging/sms/platform-default')
  async getOpsSmsPlatformDefault() {
    const businessId = await this.internalBusiness.getId();
    return this.platformSmsProvisioning.ensurePlatformDefaultSms(businessId);
  }

  @Post('messaging/sms/connect')
  async connectSms() {
    const businessId = await this.internalBusiness.getId();
    return this.platformSmsProvisioning.connectPlatformDefaultSms(businessId);
  }

  @Post('messaging/sms/connect-platform-default')
  @HttpCode(HttpStatus.OK)
  async connectOpsSmsPlatformDefault() {
    const businessId = await this.internalBusiness.getId();
    return this.platformSmsProvisioning.connectPlatformDefaultSms(businessId);
  }

  @Post('messaging/sms/connect-twilio')
  @HttpCode(HttpStatus.OK)
  async connectOpsTwilio(@Body() dto: ConnectBusinessTwilioDto) {
    const businessId = await this.internalBusiness.getId();
    return this.businessTwilioConnect.connectBusinessTwilio(businessId, dto);
  }

  @Post('messaging/sms/list-phone-numbers')
  @HttpCode(HttpStatus.OK)
  listOpsTwilioPhoneNumbers(@Body() dto: ListTwilioPhoneNumbersDto) {
    return this.businessTwilioConnect.listAvailablePhoneNumbers(
      dto.accountSid,
      dto.authToken,
    );
  }

  @Get('messaging/sms/webhook-url')
  getOpsSmsWebhookUrl() {
    return {
      inboundUrl: this.twilioApiClient.buildInboundWebhookUrl() ?? null,
      statusCallbackUrl: this.twilioApiClient.buildStatusCallbackUrl() ?? null,
    };
  }

  // ── Ops email ───────────────────────────────────────────────────────

  @Get('messaging/email/platform-default')
  async getOpsEmailPlatformDefault() {
    const businessId = await this.internalBusiness.getId();
    return this.platformEmailProvisioning.ensurePlatformDefaultEmail(
      businessId,
    );
  }

  @Post('messaging/email/connect')
  async connectEmail() {
    const businessId = await this.internalBusiness.getId();
    return this.platformEmailProvisioning.connectPlatformDefaultEmail(
      businessId,
    );
  }

  /** Keep after static messaging/sms/* and messaging/email/* routes. */
  @Get('messaging/:providerKey/status')
  async getMessagingStatus(@Param('providerKey') providerKey: string) {
    const businessId = await this.internalBusiness.getId();
    return this.messagingStatusService.getMessagingStatus(
      businessId,
      providerKey,
    );
  }
}
