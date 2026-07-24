import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { TwilioApiClient } from '../../../twilio/services/twilio-api-client';
import { BusinessTwilioConnectService } from '../../../twilio/services/business-twilio-connect.service';
import { PlatformSmsProvisioningService } from '../../../twilio/services/platform-sms-provisioning.service';
import {
  ConnectBusinessTwilioDto,
  ListTwilioPhoneNumbersDto,
} from '../../../twilio/dto/connect-business-twilio.dto';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations/business/sms')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('sms')
@StaffPermission('settings.integrations.manage')
export class SmsIntegrationController {
  constructor(
    private readonly platformSmsProvisioning: PlatformSmsProvisioningService,
    private readonly businessTwilioConnect: BusinessTwilioConnectService,
    private readonly twilioApiClient: TwilioApiClient,
  ) {}

  @Get('platform-default')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getPlatformDefault(@CurrentUser() user: RequestUser) {
    return this.platformSmsProvisioning.ensurePlatformDefaultSms(
      user.businessId!,
    );
  }

  @Post('connect-platform-default')
  @HttpCode(HttpStatus.OK)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  connectPlatformDefault(@CurrentUser() user: RequestUser) {
    return this.platformSmsProvisioning.connectPlatformDefaultSms(
      user.businessId!,
    );
  }

  @Post('connect-twilio')
  @HttpCode(HttpStatus.OK)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  connectBusinessTwilio(
    @CurrentUser() user: RequestUser,
    @Body() dto: ConnectBusinessTwilioDto,
  ) {
    return this.businessTwilioConnect.connectBusinessTwilio(
      user.businessId!,
      dto,
    );
  }

  @Post('list-phone-numbers')
  @HttpCode(HttpStatus.OK)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listPhoneNumbers(@Body() dto: ListTwilioPhoneNumbersDto) {
    return this.businessTwilioConnect.listAvailablePhoneNumbers(
      dto.accountSid,
      dto.authToken,
    );
  }

  @Get('webhook-url')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getWebhookUrl() {
    return {
      inboundUrl: this.twilioApiClient.buildInboundWebhookUrl() ?? null,
      statusCallbackUrl: this.twilioApiClient.buildStatusCallbackUrl() ?? null,
    };
  }
}
