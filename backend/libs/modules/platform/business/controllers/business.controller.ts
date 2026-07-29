import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { BusinessDashboardStatsDto } from '../dto/business-dashboard-stats.dto';
import { BusinessDashboardFeedDto } from '../dto/business-dashboard-feed.dto';
import { UpdateFinancialSettingsDto } from '../dto/financial-settings.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';
import { BusinessAccessService } from '@app/modules/platform/business/services/business-access.service';
import { BusinessService } from '@app/modules/platform/business/services/business.service';
import { DashboardStatsService } from '@app/modules/platform/business/services/dashboard-stats.service';
import { DashboardFeedService } from '@app/modules/platform/business/services/dashboard-feed.service';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import { BusinessBillingService } from '@app/modules/platform/business/services/business-billing.service';
import { EntitlementService } from '@app/modules/platform/business/services/entitlement.service';
import { BusinessAddonSyncService } from '@app/modules/platform/business/services/business-addon-sync.service';
import { BusinessLocationService } from '@app/modules/platform/business/services/business-location.service';
import { BusinessProvisioningService } from '@app/modules/platform/business/services/business-provisioning.service';
import { AddonsService } from '@app/modules/platform/addons/services/addons.service';
import { PurchaseAddonDto } from '@app/modules/platform/addons/dto/addon.dto';
import { CancelBusinessSubscriptionDto } from '../dto/cancel-business-subscription.dto';
import { ChangeBusinessPlanTierDto } from '../dto/change-business-plan-tier.dto';
import {
  CreateBusinessLocationDto,
  PreviewTierChangeDto,
} from '../dto/business-location.dto';
import { canViewAllStaffCalendars } from '@app/modules/platform/membership/permissions/staff-permission.registry';
import { BusinessSubscriptionBillingCycle } from '@prisma/client';

@ApiTags('business')
@ApiBearerAuth()
@Controller('businesses')
@UseGuards(BusinessRolesGuard)
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly businessAccessService: BusinessAccessService,
    private readonly dashboardStatsService: DashboardStatsService,
    private readonly dashboardFeedService: DashboardFeedService,
    private readonly financialSettingsService: FinancialSettingsService,
    private readonly businessBillingService: BusinessBillingService,
    private readonly entitlementService: EntitlementService,
    private readonly addonSync: BusinessAddonSyncService,
    private readonly addonsService: AddonsService,
    private readonly locationService: BusinessLocationService,
    private readonly provisioning: BusinessProvisioningService,
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

  @Get('current/entitlements')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getCurrentEntitlements(@CurrentUser() user: RequestUser) {
    return this.entitlementService.resolve(user.businessId!);
  }

  @Get('current/addons/purchasable')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  listPurchasableAddons(@CurrentUser() user: RequestUser) {
    return this.addonsService.listPurchasableForBusiness(user.businessId!);
  }

  @Post('current/addons/:addonId/purchase')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  purchaseAddon(
    @CurrentUser() user: RequestUser,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: PurchaseAddonDto,
  ) {
    return this.addonSync.purchaseIndependent(
      user.businessId!,
      addonId,
      dto.billingCycle === 'YEARLY'
        ? BusinessSubscriptionBillingCycle.YEARLY
        : BusinessSubscriptionBillingCycle.MONTHLY,
    );
  }

  @Delete('current/addons/:addonId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  cancelAddon(
    @CurrentUser() user: RequestUser,
    @Param('addonId', ParseUUIDPipe) addonId: string,
  ) {
    return this.addonSync.cancelPurchased(user.businessId!, addonId);
  }

  @Get('current/locations')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listLocations(@CurrentUser() user: RequestUser) {
    return this.locationService.list(user.businessId!);
  }

  @Post('current/locations')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createLocation(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBusinessLocationDto,
  ) {
    return this.locationService.create(user.businessId!, dto);
  }

  @Post('current/preview-tier-change')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  previewTierChange(
    @CurrentUser() user: RequestUser,
    @Body() dto: PreviewTierChangeDto,
  ) {
    return this.businessBillingService.previewCurrentPlanChange(
      user.businessId!,
      dto.tierId,
    );
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
    return this.dashboardStatsService.getStats(user.businessId!, {
      assignedToId: canViewAllStaffCalendars(
        user.staffPermissions,
        user.businessRole,
      )
        ? undefined
        : user.id,
      includeBusinessOps: user.businessRole !== BusinessMemberRole.MEMBER,
    });
  }

  @Get('current/dashboard-feed')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getDashboardFeed(
    @CurrentUser() user: RequestUser,
  ): Promise<BusinessDashboardFeedDto> {
    return this.dashboardFeedService.getFeed(user.businessId!, user);
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
