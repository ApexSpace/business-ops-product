import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  PrimaryPaymentAccountResponseDto,
  StripeAccountLinkResponseDto,
} from '../dto/stripe-account-links.dto';
import { StripeAccountLinksService } from '../services/stripe-account-links.service';

@ApiTags('payment-accounts')
@ApiBearerAuth()
@Controller()
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('payments')
export class StripeAccountSettingsController {
  constructor(
    private readonly stripeAccountLinksService: StripeAccountLinksService,
  ) {}

  @Get('payment-accounts/primary')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('payments.access')
  getPrimaryAccount(
    @CurrentUser() user: RequestUser,
  ): Promise<PrimaryPaymentAccountResponseDto> {
    return this.stripeAccountLinksService.getPrimaryAccountSummary(
      user.businessId!,
    );
  }

  @Post('integrations/business/stripe/onboarding-link')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @StaffPermission('settings.integrations.manage')
  createOnboardingLink(
    @CurrentUser() user: RequestUser,
  ): Promise<StripeAccountLinkResponseDto> {
    return this.stripeAccountLinksService.createOnboardingLink(
      user.businessId!,
      user,
    );
  }

  @Post('integrations/business/stripe/dashboard-link')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @StaffPermission('settings.integrations.manage')
  createDashboardLink(
    @CurrentUser() user: RequestUser,
  ): Promise<StripeAccountLinkResponseDto> {
    return this.stripeAccountLinksService.createDashboardLink(
      user.businessId!,
      user,
    );
  }
}
