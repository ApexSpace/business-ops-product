import {
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
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { PlatformEmailProvisioningService } from '../services/platform-email-provisioning.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations/business/email')
@UseGuards(BusinessRolesGuard)
export class EmailIntegrationController {
  constructor(
    private readonly platformEmailProvisioning: PlatformEmailProvisioningService,
  ) {}

  @Get('platform-default')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getPlatformDefault(@CurrentUser() user: RequestUser) {
    return this.platformEmailProvisioning.ensurePlatformDefaultEmail(
      user.businessId!,
    );
  }

  @Post('connect-platform-default')
  @HttpCode(HttpStatus.OK)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  connectPlatformDefault(@CurrentUser() user: RequestUser) {
    return this.platformEmailProvisioning.connectPlatformDefaultEmail(
      user.businessId!,
    );
  }
}
