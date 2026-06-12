import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { BusinessDashboardStatsDto } from '../dto/business-dashboard-stats.dto';
import { UpdateFinancialSettingsDto } from '../dto/financial-settings.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';
import { BusinessAccessService } from '@app/modules/platform/business/services/business-access.service';
import { BusinessService } from '@app/modules/platform/business/services/business.service';
import { DashboardStatsService } from '@app/modules/platform/business/services/dashboard-stats.service';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import { BusinessBillingService } from '@app/modules/platform/business/services/business-billing.service';
import { CancelBusinessSubscriptionDto } from '../dto/cancel-business-subscription.dto';
import { ChangeBusinessPlanTierDto } from '../dto/change-business-plan-tier.dto';

@ApiTags('business')
@ApiBearerAuth()
@Controller('businesses')
@UseGuards(BusinessRolesGuard)
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly businessAccessService: BusinessAccessService,
    private readonly dashboardStatsService: DashboardStatsService,
    private readonly financialSettingsService: FinancialSettingsService,
    private readonly businessBillingService: BusinessBillingService,
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

  @Get('current/access')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getCurrentAccess(@CurrentUser() user: RequestUser) {
    return this.businessAccessService.getCurrentAccess(user.businessId!);
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

  @Get('current/plan-options')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getCurrentPlanOptions(@CurrentUser() user: RequestUser) {
    return this.businessBillingService.getCurrentPlanOptions(user.businessId!);
  }

  @Post('current/change-plan-tier')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  changeCurrentPlanTier(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangeBusinessPlanTierDto,
  ) {
    return this.businessBillingService.changeCurrentPlanTier(
      user.businessId!,
      dto,
      user,
    );
  }

  @Post('current/cancel-subscription')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  cancelCurrentSubscription(
    @CurrentUser() user: RequestUser,
    @Body() dto: CancelBusinessSubscriptionDto,
  ) {
    return this.businessBillingService.cancelCurrentSubscription(
      user.businessId!,
      dto,
      user,
    );
  }

  @Get('current/financial-settings')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getFinancialSettings(@CurrentUser() user: RequestUser) {
    return this.financialSettingsService.getForBusiness(user.businessId!);
  }

  @Patch('current/financial-settings')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateFinancialSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateFinancialSettingsDto,
  ) {
    return this.financialSettingsService.updateForBusiness(
      user.businessId!,
      dto,
      user,
    );
  }
}
