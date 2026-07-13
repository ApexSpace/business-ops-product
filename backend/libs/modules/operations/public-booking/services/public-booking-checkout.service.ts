import { HttpStatus, Injectable } from '@nestjs/common';

import { ServicePaymentRequirement } from '@prisma/client';

import { randomUUID } from 'crypto';

import { AppException } from '@app/common/exceptions/app.exception';

import { ErrorCode } from '@app/common/exceptions/error-code.enum';

import { BookingDepositPaymentService } from '@app/modules/finance/payments/services/booking-deposit-payment.service';

import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';

import { ServiceWorkspaceRepository } from '@app/modules/crm/services/repositories/service-workspace.repository';

import { OnlineBookingSettingsService } from '@app/modules/operations/online-booking-settings/services/online-booking-settings.service';
import { resolveBookingTimezone } from '@app/modules/operations/online-booking-settings/utils/resolve-booking-timezone.util';

import { PublicBookingCheckoutDto } from '../dto/public-booking.dto';

import { PublicBookingContactService } from './public-booking-contact.service';

@Injectable()
export class PublicBookingCheckoutService {
  constructor(
    private readonly settingsService: OnlineBookingSettingsService,

    private readonly serviceRepository: ServiceRepository,

    private readonly workspaceRepository: ServiceWorkspaceRepository,

    private readonly bookingDepositPayment: BookingDepositPaymentService,

    private readonly publicBookingContactService: PublicBookingContactService,
  ) {}

  async createCheckout(slug: string, dto: PublicBookingCheckoutDto) {
    const context = await this.settingsService.resolveBusinessBySlug(slug);
    const schedulingTimezone = resolveBookingTimezone(
      context.timezone,
      context.business.timezone,
    );

    const service = await this.serviceRepository.findById(
      context.businessId,

      dto.serviceId,
    );

    if (!service) {
      throw new AppException(
        ErrorCode.NOT_FOUND,

        'Service not found',

        HttpStatus.NOT_FOUND,
      );
    }

    const bookingSettings =
      await this.workspaceRepository.findOnlineBookingSettings(
        context.businessId,

        dto.serviceId,
      );

    const paymentRequired =
      bookingSettings?.requirePaymentAtBooking ===
        ServicePaymentRequirement.REQUIRED ||
      bookingSettings?.requireCreditCard === true;

    const holdToken = randomUUID();

    let contactId: string | null = null;

    if (paymentRequired) {
      if (!dto.customerName?.trim()) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,

          'Customer name is required before payment',

          HttpStatus.BAD_REQUEST,
        );
      }

      const contact = await this.publicBookingContactService.resolveOrCreate(
        context.businessId,

        {
          customerName: dto.customerName.trim(),

          customerEmail: dto.customerEmail,

          phoneCountryCode: dto.phoneCountryCode,

          phoneNumber: dto.phoneNumber,

          source: dto.isEmbed ? 'Calendar Widget' : 'Public Booking',
        },
      );

      contactId = contact.id;
    }

    const price = Number(service.price?.toString() ?? '0');

    const settings = context.business.settings as Record<
      string,
      unknown
    > | null;

    const financial = settings?.financial as
      | Record<string, unknown>
      | undefined;

    const taxes = financial?.taxesAndCurrency as
      | { currencyCode?: string }
      | undefined;

    const currency = (taxes?.currencyCode ?? 'USD').toUpperCase();

    return this.bookingDepositPayment.createCheckout({
      holdToken,

      paymentRequired,

      holdPayload: {
        businessId: context.businessId,

        publicSlug: slug,

        serviceId: dto.serviceId,

        serviceName: service.name,

        staffId: dto.staffId ?? null,

        startAt: dto.startAt,

        endAt: dto.endAt,

        timezone: schedulingTimezone,

        amountDue: Number.isFinite(price) && price > 0 ? price.toFixed(2) : '0',

        currency,

        contactId,
      },
    });
  }

  async assertHoldValid(
    holdToken: string,

    payload: {
      businessId: string;

      serviceId: string;

      staffId: string | null;

      startAt: string;

      endAt: string;

      timezone: string;
    },
  ) {
    await this.bookingDepositPayment.assertHoldValid(holdToken, payload);
  }

  async releaseHold(holdToken?: string) {
    await this.bookingDepositPayment.releaseHold(holdToken);
  }

  async verifyPaymentIntent(
    businessId: string,

    paymentIntentId: string,

    expected: { serviceId: string; holdToken?: string },
  ) {
    return this.bookingDepositPayment.verifyPaymentIntent(
      businessId,

      paymentIntentId,

      expected,
    );
  }
}
