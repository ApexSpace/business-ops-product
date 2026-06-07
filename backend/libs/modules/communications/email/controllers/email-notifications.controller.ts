import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  ListEmailLogsQueryDto,
  PreviewEmailTemplateDto,
  TestEmailTemplateDto,
  UpdateEmailPreferencesDto,
  UpdateEmailTemplateDto,
} from '../dto/email.dto';
import {
  EmailNotificationService,
  EmailPreferenceService,
} from '../services/email-notification.service';
import { EmailLogsService, EmailTemplateService } from '../services/email-template.service';
import { ResendWebhookService } from '../services/resend-webhook.service';

@ApiTags('email-notifications')
@ApiBearerAuth()
@Controller('email-notifications')
@UseGuards(BusinessRolesGuard)
export class EmailNotificationsController {
  constructor(
    private readonly preferenceService: EmailPreferenceService,
    private readonly templateService: EmailTemplateService,
    private readonly logsService: EmailLogsService,
  ) {}

  @Get('preferences')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listPreferences(@CurrentUser() user: RequestUser) {
    return this.preferenceService.listPreferences(user.businessId!);
  }

  @Patch('preferences')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateEmailPreferencesDto,
  ) {
    return this.preferenceService.updatePreferences(
      user.businessId!,
      dto.preferences,
    );
  }

  @Get('templates')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listTemplates(@CurrentUser() user: RequestUser) {
    return this.templateService.listTemplates(user.businessId!);
  }

  @Get('templates/:emailType')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getTemplate(
    @CurrentUser() user: RequestUser,
    @Param('emailType') emailType: string,
  ) {
    return this.templateService.getTemplate(user.businessId!, emailType);
  }

  @Patch('templates/:emailType')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateTemplate(
    @CurrentUser() user: RequestUser,
    @Param('emailType') emailType: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.templateService.updateTemplate(
      user.businessId!,
      emailType,
      dto,
      user,
    );
  }

  @Post('templates/:emailType/preview')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  previewTemplate(
    @CurrentUser() user: RequestUser,
    @Param('emailType') emailType: string,
    @Body() dto: PreviewEmailTemplateDto,
  ) {
    return this.templateService.previewTemplate(user.businessId!, emailType, dto);
  }

  @Post('templates/:emailType/test')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  testTemplate(
    @CurrentUser() user: RequestUser,
    @Param('emailType') emailType: string,
    @Body() dto: TestEmailTemplateDto,
  ) {
    return this.templateService.sendTestEmail(
      user.businessId!,
      emailType,
      dto,
      user,
    );
  }

  @Post('templates/:emailType/reset')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  resetTemplate(
    @CurrentUser() user: RequestUser,
    @Param('emailType') emailType: string,
  ) {
    return this.templateService.resetTemplate(user.businessId!, emailType);
  }

  @Get('logs')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listLogs(
    @CurrentUser() user: RequestUser,
    @Query() query: ListEmailLogsQueryDto,
  ) {
    return this.logsService.listLogs(user.businessId!, query);
  }
}

@ApiTags('webhooks')
@Controller('webhooks/resend')
export class ResendWebhookController {
  constructor(private readonly resendWebhookService: ResendWebhookService) {}

  @Post()
  @Public()
  @SkipEnvelope()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for Resend webhook verification');
    }

    await this.resendWebhookService.handleWebhook(rawBody, req.headers);
    return { received: true };
  }
}
