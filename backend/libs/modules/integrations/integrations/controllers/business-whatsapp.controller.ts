import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireCapability } from '@app/common/decorators/require-capability.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  WhatsAppNumberResponseDto,
  WhatsAppOverviewResponseDto,
} from '../dto/whatsapp-numbers.dto';
import { WhatsAppNumbersService } from '../services/whatsapp-numbers.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations/business/whatsapp')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireCapability('settings.integrations')
@StaffPermission('settings.integrations.manage')
export class BusinessWhatsAppController {
  constructor(
    private readonly whatsAppNumbersService: WhatsAppNumbersService,
  ) {}

  @Get('overview')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getOverview(
    @CurrentUser() user: RequestUser,
  ): Promise<WhatsAppOverviewResponseDto> {
    return this.whatsAppNumbersService.getOverview(user.businessId!);
  }

  @Get('numbers')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listNumbers(
    @CurrentUser() user: RequestUser,
  ): Promise<WhatsAppNumberResponseDto[]> {
    return this.whatsAppNumbersService.listNumbers(user.businessId!);
  }
}
