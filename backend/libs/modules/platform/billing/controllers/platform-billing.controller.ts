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
import { PlatformMemberRole, SubscriptionStatus } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import {
  AssignSubscriptionDto,
  BillingOverviewDto,
  BillingSubscriptionDto,
  UpdateSubscriptionDto,
} from '../dto/billing.dto';
import { BillingService } from '@app/modules/platform/billing/services/billing.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/billing')
@UseGuards(PlatformRolesGuard)
export class PlatformBillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('overview')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  getOverview(): Promise<BillingOverviewDto> {
    return this.billingService.getOverview();
  }

  @Get('subscriptions')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  listSubscriptions(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: SubscriptionStatus,
  ): Promise<{
    items: BillingSubscriptionDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip } = getPaginationParams(query);
    return this.billingService.listSubscriptions({
      page,
      limit,
      skip,
      status,
    });
  }

  @Get('businesses/:businessId/subscription')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  getSubscription(
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ): Promise<BillingSubscriptionDto | null> {
    return this.billingService.getSubscription(businessId);
  }

  @Post('businesses/:businessId/subscription')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  assignSubscription(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: AssignSubscriptionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BillingSubscriptionDto> {
    return this.billingService.assignSubscription(businessId, dto, user);
  }

  @Patch('businesses/:businessId/subscription')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  updateSubscription(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BillingSubscriptionDto> {
    return this.billingService.updateSubscription(businessId, dto, user);
  }
}
