import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import {
  CreateMembershipPlanDto,
  ReorderMembershipPlansDto,
  UpdateAdvancedDto,
  UpdateAgreementDto,
  UpdateDiscountsDto,
  UpdatePlanDetailsDto,
  UpdatePlanOnlineSalesDto,
  UpdateServiceGroupsDto,
} from '../dto/membership.dto';
import { MembershipPlansService } from '../services/membership-plans.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('membership-plans')
@ApiBearerAuth()
@Controller('memberships/plans')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('memberships')
@StaffPermission('memberships.access')
export class MembershipPlansController {
  constructor(private readonly plansService: MembershipPlansService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  listPlans(
    @CurrentUser() user: RequestUser,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.plansService.listPlans(
      user.businessId!,
      includeArchived === 'true',
    );
  }

  @Post('reorder')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  reorder(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderMembershipPlansDto,
  ) {
    return this.plansService.reorder(user.businessId!, dto, user);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  createPlan(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMembershipPlanDto,
  ) {
    return this.plansService.createPlan(user.businessId!, dto, user);
  }

  @Get(':id')
  @BusinessRoles(...MEMBER_ROLES)
  getPlan(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plansService.getPlan(user.businessId!, id);
  }

  @Patch(':id/details')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  updateDetails(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDetailsDto,
  ) {
    return this.plansService.updatePlanDetails(user.businessId!, id, dto, user);
  }

  @Patch(':id/service-groups')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  updateServiceGroups(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceGroupsDto,
  ) {
    return this.plansService.updateServiceGroups(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/discounts')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  updateDiscounts(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscountsDto,
  ) {
    return this.plansService.updateDiscounts(user.businessId!, id, dto, user);
  }

  @Patch(':id/agreement')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  updateAgreement(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgreementDto,
  ) {
    return this.plansService.updateAgreement(user.businessId!, id, dto, user);
  }

  @Patch(':id/online-sales')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  updateOnlineSales(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanOnlineSalesDto,
  ) {
    return this.plansService.updateOnlineSales(user.businessId!, id, dto, user);
  }

  @Patch(':id/advanced')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  updateAdvanced(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdvancedDto,
  ) {
    return this.plansService.updateAdvanced(user.businessId!, id, dto, user);
  }

  @Post(':id/duplicate')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  duplicatePlan(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plansService.duplicatePlan(user.businessId!, id, user);
  }

  @Post(':id/archive')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  archivePlan(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plansService.archivePlan(user.businessId!, id, user);
  }
}
