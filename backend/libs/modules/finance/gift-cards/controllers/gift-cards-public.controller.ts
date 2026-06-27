import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common/decorators/public.decorator';
import { OnlineGiftCardCheckoutDto } from '../dto/gift-card.dto';
import { GiftCardOnlineCheckoutService } from '../services/gift-card-online-checkout.service';

@ApiTags('public-gift-cards')
@Controller('public/gift-cards')
@Public()
export class GiftCardsPublicController {
  constructor(
    private readonly onlineCheckoutService: GiftCardOnlineCheckoutService,
  ) {}

  @Get(':slug')
  getPage(@Param('slug') slug: string) {
    return this.onlineCheckoutService.getPublicPage(slug);
  }

  @Post(':slug/checkout')
  checkout(
    @Param('slug') slug: string,
    @Body() dto: OnlineGiftCardCheckoutDto,
  ) {
    return this.onlineCheckoutService.createPaymentIntent(slug, dto);
  }
}
