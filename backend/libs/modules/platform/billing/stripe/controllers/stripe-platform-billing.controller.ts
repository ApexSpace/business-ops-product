import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole, PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import {
  CheckoutSessionResponseDto,
  CreateBusinessCheckoutSessionDto,
  CreatePlatformCheckoutSessionDto,
  CreatePublicCheckoutSessionDto,
  PortalSessionResponseDto,
} from '../dto/stripe-platform-billing.dto';
import { StripePlatformCheckoutService } from '../services/stripe-platform-checkout.service';
import { StripePlatformPortalService } from '../services/stripe-platform-portal.service';
import { StripePlatformPaymentMethodService } from '../services/stripe-platform-payment-method.service';

const PLATFORM_ADMIN_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
] as const;

@ApiTags('platform-billing')
@Controller()
export class StripePlatformBillingController {
  constructor(
    private readonly checkoutService: StripePlatformCheckoutService,
    private readonly portalService: StripePlatformPortalService,
    private readonly paymentMethodService: StripePlatformPaymentMethodService,
  ) {}

  @Post('platform/billing/stripe/checkout-session')
  @ApiBearerAuth()
  @UseGuards(PlatformRolesGuard)
  @PlatformRoles(...PLATFORM_ADMIN_ROLES)
  createPlatformCheckoutSession(
    @Body() dto: CreatePlatformCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.checkoutService.createCheckoutSession(dto);
  }

  @Post('businesses/current/billing/setup-intent')
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createCurrentSetupIntent(@CurrentUser() user: RequestUser) {
    return this.paymentMethodService.createSetupIntent(user.businessId!);
  }

  @Get('businesses/current/billing/payment-methods')
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  listCurrentPaymentMethods(@CurrentUser() user: RequestUser) {
    return this.paymentMethodService.listPaymentMethods(user.businessId!);
  }

  @Post('platform/businesses/:id/billing/setup-intent')
  @ApiBearerAuth()
  @UseGuards(PlatformRolesGuard)
  @PlatformRoles(...PLATFORM_ADMIN_ROLES)
  createPlatformBusinessSetupIntent(
    @Param('id', ParseUUIDPipe) businessId: string,
  ) {
    return this.paymentMethodService.createSetupIntent(businessId);
  }

  @Post('platform/businesses/:id/billing/stripe/portal-session')
  @ApiBearerAuth()
  @UseGuards(PlatformRolesGuard)
  @PlatformRoles(...PLATFORM_ADMIN_ROLES)
  createPlatformBusinessPortalSession(
    @Param('id', ParseUUIDPipe) businessId: string,
  ): Promise<PortalSessionResponseDto> {
    return this.portalService.createPortalSession(businessId);
  }

  @Post('businesses/current/billing/stripe/checkout-session')
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createCurrentBusinessCheckoutSession(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBusinessCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.checkoutService.createCheckoutSessionForCurrentBusiness(
      user.businessId!,
      dto,
      user.email,
    );
  }

  @Post('businesses/current/billing/stripe/portal-session')
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createCurrentBusinessPortalSession(
    @CurrentUser() user: RequestUser,
  ): Promise<PortalSessionResponseDto> {
    return this.portalService.createPortalSession(user.businessId!);
  }

  @Post('public/pricing/:planGroupId/stripe/checkout-session')
  @Public()
  createPublicCheckoutSession(
    @Param('planGroupId', ParseUUIDPipe) planGroupId: string,
    @Body() dto: CreatePublicCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.checkoutService.createCheckoutSession({
      businessId: dto.businessId,
      planGroupId,
      planTierId: dto.planTierId,
      billingCycle: dto.billingCycle,
    });
  }
}
