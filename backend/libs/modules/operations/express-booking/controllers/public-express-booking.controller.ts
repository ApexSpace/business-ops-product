import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import {
  ExpressCheckoutDto,
  ExpressCompleteDto,
} from '../dto/express-booking.dto';
import { ExpressBookingService } from '../services/express-booking.service';

@ApiTags('public-express-booking')
@Public()
@Controller('public/express')
export class PublicExpressBookingController {
  constructor(private readonly expressBookingService: ExpressBookingService) {}

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.expressBookingService.getByToken(token);
  }

  @Get(':token/staff')
  listStaff(@Param('token') token: string) {
    return this.expressBookingService.listStaffForToken(token);
  }

  @Post(':token/checkout')
  createCheckout(
    @Param('token') token: string,
    @Body() dto: ExpressCheckoutDto,
  ) {
    return this.expressBookingService.createCheckout(token, dto);
  }

  @Post(':token/complete')
  complete(
    @Param('token') token: string,
    @Body() dto: ExpressCompleteDto,
    @Req() req: Request,
  ) {
    return this.expressBookingService.complete(token, dto, {
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
