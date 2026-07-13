import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
  forwardRef,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { StaffGender } from '@prisma/client';
import type { Request } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import {
  CreatePublicBookingDto,
  JoinBookingWaitlistDto,
  PublicBookingAttachPhotosDto,
  PublicBookingAvailabilityBaseQueryDto,
  PublicBookingCheckoutDto,
  PublicBookingPhotoUploadDto,
} from '../dto/public-booking.dto';
import { PublicBookingService } from '../services/public-booking.service';
import { PublicBookingCheckoutService } from '../services/public-booking-checkout.service';
import { WaitlistService } from '@app/modules/operations/waitlist/services/waitlist.service';
import { OnlineBookingSettingsService } from '@app/modules/operations/online-booking-settings/services/online-booking-settings.service';
import { parseServiceLinesFromHttpQuery, normalizeServiceLinesValue } from '../utils/parse-service-lines-query.util';

@ApiTags('public-booking')
@Controller('public/booking')
export class PublicBookingController {
  constructor(
    private readonly publicBookingService: PublicBookingService,
    private readonly checkoutService: PublicBookingCheckoutService,
    @Inject(forwardRef(() => WaitlistService))
    private readonly waitlistService: WaitlistService,
    private readonly settingsService: OnlineBookingSettingsService,
  ) {}

  @Get('businesses/:slug')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getBusiness(@Param('slug') slug: string) {
    return this.publicBookingService.getBusinessBySlug(slug);
  }

  @Get('businesses/:slug/catalog')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getCatalog(@Param('slug') slug: string, @Query('staffId') staffId?: string) {
    return this.publicBookingService.getCatalog(slug, staffId);
  }

  @Get('businesses/:slug/staff')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getStaff(
    @Param('slug') slug: string,
    @Query('serviceId') serviceId: string,
    @Query('genderFilter') genderFilter?: StaffGender,
  ) {
    return this.publicBookingService.getStaffForService(
      slug,
      serviceId,
      genderFilter,
    );
  }

  @Get('businesses/:slug/availability')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )
  getBusinessAvailability(
    @Param('slug') slug: string,
    @Query() query: PublicBookingAvailabilityBaseQueryDto,
    @Req() req: Request,
  ) {
    const serviceLines =
      normalizeServiceLinesValue(query.serviceLines) ??
      parseServiceLinesFromHttpQuery(req.query as Record<string, unknown>);
    return this.publicBookingService.getAvailability(slug, {
      ...query,
      serviceLines,
    });
  }

  @Post('businesses/:slug/appointments')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  createBusinessAppointment(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicBookingDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    return this.publicBookingService.createBooking(
      slug,
      { ...dto, referrer: dto.referrer ?? referer },
      {
        userAgent,
        isEmbed: dto.source === 'BOOKING_WIDGET',
      },
    );
  }

  @Post('businesses/:slug/waitlist')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async joinWaitlist(
    @Param('slug') slug: string,
    @Body() dto: JoinBookingWaitlistDto,
  ) {
    const context = await this.settingsService.resolveBusinessBySlug(slug);
    return this.waitlistService.joinFromPublicBooking({
      businessId: context.businessId,
      businessName: context.business.name,
      waitlistEnabled: context.waitlistEnabled,
      dto,
    });
  }

  @Post('businesses/:slug/checkout')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  createCheckout(
    @Param('slug') slug: string,
    @Body() dto: PublicBookingCheckoutDto,
  ) {
    return this.checkoutService.createCheckout(slug, dto);
  }

  @Post('businesses/:slug/uploads')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  createPhotoUpload(
    @Param('slug') slug: string,
    @Body() dto: PublicBookingPhotoUploadDto,
  ) {
    return this.publicBookingService.createPhotoUpload(slug, dto);
  }

  @Post('businesses/:slug/photos')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  attachPhotos(
    @Param('slug') slug: string,
    @Body() dto: PublicBookingAttachPhotosDto,
  ) {
    return this.publicBookingService.attachPhotos(slug, dto);
  }

  /** @deprecated Use businesses/:slug — kept for redirect compatibility */
  @Get('calendars/:slug')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getCalendar(@Param('slug') slug: string) {
    return this.publicBookingService.getBusinessBySlug(slug);
  }

  /** @deprecated */
  @Get('calendars/:slug/availability')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )
  getCalendarAvailability(
    @Param('slug') slug: string,
    @Query() query: PublicBookingAvailabilityBaseQueryDto,
    @Req() req: Request,
  ) {
    const serviceLines =
      normalizeServiceLinesValue(query.serviceLines) ??
      parseServiceLinesFromHttpQuery(req.query as Record<string, unknown>);
    return this.publicBookingService.getAvailability(slug, {
      ...query,
      serviceLines,
    });
  }

  /** @deprecated */
  @Post('calendars/:slug/appointments')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  createCalendarAppointment(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicBookingDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    return this.publicBookingService.createBooking(
      slug,
      { ...dto, referrer: dto.referrer ?? referer },
      { userAgent, isEmbed: dto.source === 'BOOKING_WIDGET' },
    );
  }
}
