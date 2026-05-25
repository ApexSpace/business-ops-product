import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { BusinessRoles } from '../../../common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '../../../common/guards/business-roles.guard';
import { BusinessDashboardStatsDto } from '../dto/business-dashboard-stats.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';
import { BusinessService } from '../services/business.service';
import { DashboardStatsService } from '../services/dashboard-stats.service';

@ApiTags('business')
@ApiBearerAuth()
@Controller('businesses')
@UseGuards(BusinessRolesGuard)
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly dashboardStatsService: DashboardStatsService,
  ) {}

  @Get('current')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getCurrent(@CurrentUser() user: RequestUser) {
    return this.businessService.getCurrent(user.businessId!);
  }

  @Get('current/dashboard-stats')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getDashboardStats(
    @CurrentUser() user: RequestUser,
  ): Promise<BusinessDashboardStatsDto> {
    return this.dashboardStatsService.getStats(user.businessId!);
  }

  @Patch('current')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateCurrent(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessService.updateCurrent(user.businessId!, dto, user);
  }
}
