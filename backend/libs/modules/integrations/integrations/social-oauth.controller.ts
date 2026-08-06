import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
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
import { SocialOAuthService } from './social-oauth.service';

@ApiTags('integrations')
@Controller('integrations/oauth')
export class SocialOAuthController {
  constructor(private readonly socialOAuthService: SocialOAuthService) {}

  @Get('x/start')
  @SkipEnvelope()
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @StaffPermission('settings.integrations.manage')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  async startX(@CurrentUser() user: RequestUser, @Res() res: Response) {
    await this.socialOAuthService.redirectToProvider(user, 'x', res);
  }

  @Get('x/callback')
  @Public()
  @SkipEnvelope()
  async callbackX(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.socialOAuthService.handleCallback('x', code, state, error, res);
  }

  @Get('pinterest/start')
  @SkipEnvelope()
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @StaffPermission('settings.integrations.manage')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  async startPinterest(
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    await this.socialOAuthService.redirectToProvider(user, 'pinterest', res);
  }

  @Get('pinterest/callback')
  @Public()
  @SkipEnvelope()
  async callbackPinterest(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.socialOAuthService.handleCallback(
      'pinterest',
      code,
      state,
      error,
      res,
    );
  }

  @Get('tiktok/start')
  @SkipEnvelope()
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @StaffPermission('settings.integrations.manage')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  async startTikTok(@CurrentUser() user: RequestUser, @Res() res: Response) {
    await this.socialOAuthService.redirectToProvider(user, 'tiktok', res);
  }

  @Get('tiktok/callback')
  @Public()
  @SkipEnvelope()
  async callbackTikTok(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.socialOAuthService.handleCallback(
      'tiktok',
      code,
      state,
      error,
      res,
    );
  }
}
