import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { PayableType } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { PayableHandlerRegistry } from '../registry/payable-handler.registry';
import { BookingDepositHoldStore } from '../stores/booking-deposit-hold.store';
import type {
  PayableHandler,
  PayableSnapshot,
  PaymentCompleteContext,
} from '../types/payable.types';

@Injectable()
export class BookingDepositPayableHandler
  implements PayableHandler, OnModuleInit
{
  readonly payableType = PayableType.BOOKING_DEPOSIT;

  constructor(
    private readonly registry: PayableHandlerRegistry,
    private readonly holdStore: BookingDepositHoldStore,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async resolvePayable(
    businessId: string,
    payableId: string,
  ): Promise<PayableSnapshot> {
    const hold = await this.holdStore.get(payableId);
    if (hold && hold.businessId === businessId) {
      if (!hold.contactId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Customer details are required before payment',
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        amountDue: hold.amountDue,
        contactId: hold.contactId,
        description: `Online booking — ${hold.serviceName}`,
        currency: hold.currency,
      };
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: payableId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        contactId: true,
        service: { select: { name: true, price: true } },
        business: {
          select: {
            settings: true,
          },
        },
      },
    });

    if (!appointment?.contactId) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Booking deposit not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const settings = appointment.business.settings as Record<
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
    const price = appointment.service?.price?.toString() ?? '0';

    return {
      amountDue: price,
      contactId: appointment.contactId,
      description: `Booking deposit — ${appointment.service?.name ?? 'Appointment'}`,
      currency,
    };
  }

  /**
   * Intentionally a no-op. Prepaid CHECKOUT sale creation is owned by the
   * Express / Public Online Booking complete path via BookingLinkSaleService.
   */
  async onPaymentComplete(_ctx: PaymentCompleteContext): Promise<void> {
    return;
  }
}
