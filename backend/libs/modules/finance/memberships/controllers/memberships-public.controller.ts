import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common/decorators/public.decorator';
import { InitiateMembershipCheckoutDto } from '../dto/membership.dto';
import { MembershipOnlineCheckoutService } from '../services/membership-online-checkout.service';

@ApiTags('memberships-public')
@Controller('public/memberships')
@Public()
export class MembershipsPublicController {
  constructor(
    private readonly onlineCheckoutService: MembershipOnlineCheckoutService,
  ) {}

  @Get(':slug')
  getCatalog(@Param('slug') slug: string) {
    return this.onlineCheckoutService.getPublicCatalog(slug);
  }

  @Get(':slug/plans/:planId')
  getPlan(
    @Param('slug') slug: string,
    @Param('planId') planId: string,
  ) {
    return this.onlineCheckoutService.getPlanForCheckout(slug, planId);
  }

  @Post(':slug/plans/:planId/checkout')
  createCheckout(
    @Param('slug') slug: string,
    @Param('planId') planId: string,
    @Body() dto: InitiateMembershipCheckoutDto,
  ) {
    return this.onlineCheckoutService.createCheckoutSession(slug, planId, dto);
  }
}
