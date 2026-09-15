import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { StripeAccountLinksService } from '@app/modules/integrations/integrations/stripe/services/stripe-account-links.service';
import { UpdatePaymentsModeDto } from '@app/modules/integrations/integrations/stripe/dto/update-payments-mode.dto';
import { PlatformPaymentsHubQueryDto } from '../dto/platform-payments-hub-query.dto';
import { PlatformPaymentsHubService } from '../services/platform-payments-hub.service';

const PLATFORM_PAYMENTS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-payments')
@ApiBearerAuth()
@Controller('platform/payments')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_PAYMENTS_ROLES)
export class PlatformPaymentsHubController {
  constructor(
    private readonly platformPaymentsHubService: PlatformPaymentsHubService,
    private readonly internalBusiness: InternalBusinessService,
    private readonly stripeAccountLinksService: StripeAccountLinksService,
  ) {}

  @Get()
  list(@Query() query: PlatformPaymentsHubQueryDto) {
    return this.platformPaymentsHubService.list(query);
  }

  @Get('mode')
  async getMode() {
    const businessId = await this.internalBusiness.getId();
    return this.stripeAccountLinksService.getPrimaryAccountSummary(businessId);
  }

  @Patch('mode')
  async updateMode(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePaymentsModeDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.stripeAccountLinksService.updatePaymentsMode(
      businessId,
      dto.mode,
      user,
    );
  }
}
