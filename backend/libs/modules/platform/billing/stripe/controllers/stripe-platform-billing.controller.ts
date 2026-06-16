import {
  Body,
  Controller,
  HttpStatus,
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
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
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
  SubscribePlanTierDto,
  SubscribePlanTierResponseDto,
} from '../dto/stripe-platform-billing.dto';
import { StripePlatformCheckoutService } from '../services/stripe-platform-checkout.service';
import { StripePlatformPortalService } from '../services/stripe-platform-portal.service';
import { StripePlatformSubscribeService } from '../services/stripe-platform-subscribe.service';
import { StripePlatformResyncService } from '../services/stripe-platform-resync.service';
import { BusinessBillingService } from '@app/modules/platform/business/services/business-billing.service';
import { CancelBusinessSubscriptionResponseDto } from '@app/modules/platform/business/dto/cancel-business-subscription-response.dto';

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
    private readonly subscribeService: StripePlatformSubscribeService,
    private readonly resyncService: StripePlatformResyncService,
    private readonly businessBillingService: BusinessBillingService,
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

  @Post('platform/businesses/:id/billing/stripe/portal-session')
  @ApiBearerAuth()
  @UseGuards(PlatformRolesGuard)
  @PlatformRoles(...PLATFORM_ADMIN_ROLES)
  createPlatformBusinessPortalSession(
    @Param('id', ParseUUIDPipe) businessId: string,
  ): Promise<PortalSessionResponseDto> {
    return this.portalService.createPortalSession(businessId);
  }

  @Post('platform/businesses/:id/billing/stripe/resync')
  @ApiBearerAuth()
  @UseGuards(PlatformRolesGuard)
  @PlatformRoles(...PLATFORM_ADMIN_ROLES)
  resyncPlatformBusinessSubscription(
    @Param('id', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.resyncService.resyncSubscription(businessId, user);
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
    );
  }

  @Post('businesses/current/billing/subscribe')
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  subscribeCurrentBusiness(
    @CurrentUser() user: RequestUser,
    @Body() dto: SubscribePlanTierDto,
  ): Promise<SubscribePlanTierResponseDto> {
    if (!user.businessId) {
      throw new AppException(
        ErrorCode.NO_BUSINESS_CONTEXT,
        'Business context is required to subscribe',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.subscribeService.subscribeToPlanTier({
      businessId: user.businessId,
      planGroupId: dto.planGroupId,
      planTierId: dto.planTierId,
      billingCycle: dto.billingCycle,
      actor: user,
    });
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

  @Post('businesses/current/billing/stripe/resume-subscription')
  @ApiBearerAuth()
  @UseGuards(BusinessRolesGuard)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  resumeCurrentBusinessSubscription(
    @CurrentUser() user: RequestUser,
  ): Promise<CancelBusinessSubscriptionResponseDto> {
    if (!user.businessId) {
      throw new AppException(
        ErrorCode.NO_BUSINESS_CONTEXT,
        'Business context is required to resume subscription',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.businessBillingService.resumeCurrentSubscription(
      user.businessId,
      user,
    );
  }

  @Post('public/pricing/:planGroupId/stripe/checkout-session')
  @Public()
  createPublicCheckoutSession(
    @Param('planGroupId', ParseUUIDPipe) planGroupId: string,
    @Body() dto: CreatePublicCheckoutSessionDto,
  ): Promise<SubscribePlanTierResponseDto> {
    return this.subscribeService.subscribeToPlanTier({
      businessId: dto.businessId,
      planGroupId,
      planTierId: dto.planTierId,
      billingCycle: dto.billingCycle,
    });
  }
}
