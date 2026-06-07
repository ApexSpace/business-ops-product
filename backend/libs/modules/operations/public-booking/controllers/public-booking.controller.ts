import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@app/common/decorators/public.decorator';
import {
  CreatePublicBookingDto,
  PublicBookingAvailabilityQueryDto,
} from '../dto/public-booking.dto';
import { PublicBookingService } from '../services/public-booking.service';

@ApiTags('public-booking')
@Controller('public/booking')
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get('calendars/:slug')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getCalendar(@Param('slug') slug: string) {
    return this.publicBookingService.getCalendarBySlug(slug);
  }

  @Get('calendars/:slug/availability')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  getAvailability(
    @Param('slug') slug: string,
    @Query() query: PublicBookingAvailabilityQueryDto,
  ) {
    return this.publicBookingService.getAvailability(slug, query);
  }

  @Post('calendars/:slug/appointments')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  createAppointment(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicBookingDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    return this.publicBookingService.createBooking(slug, {
      ...dto,
      referrer: dto.referrer ?? referer,
    }, {
      userAgent,
      isEmbed: dto.source === 'BOOKING_WIDGET',
    });
  }
}
