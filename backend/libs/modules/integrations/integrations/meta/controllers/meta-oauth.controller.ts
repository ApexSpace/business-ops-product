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
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { WhatsAppEmbeddedSignupCompleteDto } from '../dto/whatsapp-embedded-signup.dto';
import { MetaEmbeddedSignupService } from '@app/modules/integrations/integrations/meta/services/meta-embedded-signup.service';
import { MetaOAuthCallbackRouter } from '@app/modules/integrations/integrations/meta/services/meta-oauth-callback.router';
import { MetaOAuthService } from '@app/modules/integrations/integrations/meta/services/meta-oauth.service';

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
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  getClientConfig(@CurrentUser() _user: RequestUser) {
    return this.metaOAuthService.getClientConfig();
  }

  @Get('start')
  @SkipEnvelope()
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
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
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
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
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
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
