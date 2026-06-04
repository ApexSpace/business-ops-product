import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import type { Response } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { GoogleOAuthService } from './google-oauth.service';

@ApiTags('integrations')
@Controller('integrations/oauth/google')
export class GoogleOAuthController {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

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
    await this.googleOAuthService.redirectToGoogle(user, providerKey, res);
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
    await this.googleOAuthService.handleCallback(code, state, error, res);
  }
}
