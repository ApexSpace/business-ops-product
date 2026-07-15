import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import type { Response } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { WhatsAppEmbeddedSignupCompleteDto } from '../dto/whatsapp-embedded-signup.dto';
import { MetaEmbeddedSignupService } from '@app/modules/integrations/integrations/meta/services/meta-embedded-signup.service';
import { MetaOAuthCallbackRouter } from '@app/modules/integrations/integrations/meta/services/meta-oauth-callback.router';
import { MetaOAuthService } from '@app/modules/integrations/integrations/meta/services/meta-oauth.service';

const INTEGRATIONS_MANAGE_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('integrations')
@Controller('integrations/oauth/meta')
export class MetaOAuthController {
  constructor(
    private readonly metaOAuthService: MetaOAuthService,
    private readonly metaEmbeddedSignupService: MetaEmbeddedSignupService,
    private readonly metaOAuthCallbackRouter: MetaOAuthCallbackRouter,
  ) {}

  @Get('client-config')
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @StaffPermission('settings.integrations.manage')
  @BusinessRoles(...INTEGRATIONS_MANAGE_ROLES)
  getClientConfig(@CurrentUser() _user: RequestUser) {
    return this.metaOAuthService.getClientConfig();
  }

  @Get('start')
  @SkipEnvelope()
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @StaffPermission('settings.integrations.manage')
  @BusinessRoles(...INTEGRATIONS_MANAGE_ROLES)
  async start(
    @CurrentUser() user: RequestUser,
    @Query('providerKey') providerKey: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.metaOAuthService.redirectToMeta(user, providerKey, res);
  }

  @Get('callback')
  @Public()
  @SkipEnvelope()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.metaOAuthCallbackRouter.routeCallback(code, state, error, res);
  }

  @Get('whatsapp/start')
  @SkipEnvelope()
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @StaffPermission('settings.integrations.manage')
  @BusinessRoles(...INTEGRATIONS_MANAGE_ROLES)
  async whatsappStart(
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ): Promise<void> {
    await this.metaEmbeddedSignupService.redirectToWhatsAppSignup(user, res);
  }

  @Get('whatsapp/callback')
  @Public()
  @SkipEnvelope()
  async whatsappCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.metaOAuthCallbackRouter.routeCallback(code, state, error, res);
  }

  @Post('whatsapp/embedded-signup/complete')
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @StaffPermission('settings.integrations.manage')
  @BusinessRoles(...INTEGRATIONS_MANAGE_ROLES)
  async whatsappEmbeddedSignupComplete(
    @CurrentUser() user: RequestUser,
    @Body() dto: WhatsAppEmbeddedSignupCompleteDto,
  ): Promise<{ success: true }> {
    await this.metaEmbeddedSignupService.completeEmbeddedSignup(
      user.businessId!,
      user.id,
      dto,
    );
    return { success: true };
  }
}
