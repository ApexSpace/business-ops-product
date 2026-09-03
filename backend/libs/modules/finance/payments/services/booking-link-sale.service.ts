import { Injectable } from '@nestjs/common';
import {
  InvoiceKind,
  InvoiceLineType,
  InvoicePaymentStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PayableType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { generateInvoicePublicToken } from '@app/modules/finance/invoices/utils/invoice-public-token.util';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';

export type CreatePrepaidCheckoutSaleParams = {
  businessId: string;
  appointmentId: string;
  contactId: string;
  serviceId: string;
  serviceName: string;
  staffUserId?: string;
  amount: string | number | Prisma.Decimal;
  currency?: string;
  paymentIntentId: string;
  chargeId?: string;
};

export type CreatePartialDepositCheckoutParams = {
  businessId: string;
  appointmentId: string;
  contactId: string;
  serviceId: string;
  serviceName: string;
  staffUserId?: string;
  servicePrice: string | number | Prisma.Decimal;
  depositAmount: string | number | Prisma.Decimal;
  currency?: string;
  paymentIntentId: string;
  chargeId?: string;
};

@Injectable()
export class BookingLinkSaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialSettingsService: FinancialSettingsService,
  ) {}

  /**
   * Creates a PAID CHECKOUT invoice + Stripe payment for a booking-link deposit.
   * Idempotent by stripePaymentIntentId and by existing PAID checkout on the appointment.
   */
  async createPrepaidCheckoutSale(
    params: CreatePrepaidCheckoutSaleParams,
  ): Promise<{ checkoutId: string }> {
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        stripePaymentIntentId: params.paymentIntentId,
        deletedAt: null,
      },
      select: { invoiceId: true },
    });
    if (existingPayment) {
      return { checkoutId: existingPayment.invoiceId };
    }

    const existingCheckout = await this.prisma.invoice.findFirst({
      where: {
        businessId: params.businessId,
        appointmentId: params.appointmentId,
        kind: InvoiceKind.CHECKOUT,
        status: InvoiceStatus.PAID,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existingCheckout) {
      return { checkoutId: existingCheckout.id };
    }

    const amount = new Prisma.Decimal(params.amount);
    const now = new Date();
    const { invoiceNumber, displaySequence } =
      await this.financialSettingsService.allocateCheckoutNumber(
        params.businessId,
      );

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          business: { connect: { id: params.businessId } },
          contact: { connect: { id: params.contactId } },
          appointment: { connect: { id: params.appointmentId } },
          kind: InvoiceKind.CHECKOUT,
          invoiceNumber,
          displaySequence,
          publicToken: generateInvoicePublicToken(),
          status: InvoiceStatus.PAID,
          paymentStatus: InvoicePaymentStatus.PAID,
          issueDate: now,
          subtotal: amount,
          taxAmount: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: amount,
          balanceDue: new Prisma.Decimal(0),
          remainingAmount: new Prisma.Decimal(0),
          paidAmount: amount,
          lastPaymentAt: now,
          closedAt: now,
          items: {
            create: [
              {
                lineType: InvoiceLineType.SERVICE,
                service: { connect: { id: params.serviceId } },
                ...(params.staffUserId
                  ? { staffUser: { connect: { id: params.staffUserId } } }
                  : {}),
                title: params.serviceName,
                quantity: new Prisma.Decimal(1),
                unitPrice: amount,
                totalPrice: amount,
                sortOrder: 0,
              },
            ],
          },
        },
      });

      await tx.payment.create({
        data: {
          business: { connect: { id: params.businessId } },
          invoice: { connect: { id: created.id } },
          contact: { connect: { id: params.contactId } },
          payableType: PayableType.INVOICE,
          payableId: created.id,
          amount,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.SUCCEEDED,
          provider: PaymentProvider.STRIPE,
          reference: params.paymentIntentId,
          stripePaymentIntentId: params.paymentIntentId,
          ...(params.chargeId ? { stripeChargeId: params.chargeId } : {}),
          paidAt: now,
          ...(params.currency
            ? { providerMetadata: { currency: params.currency } }
            : {}),
        },
      });

      return created;
    });

    return { checkoutId: invoice.id };
  }

  /**
   * Creates an OPEN checkout with a partial deposit payment recorded.
   * Idempotent by stripePaymentIntentId and by existing OPEN checkout on the appointment.
   */
  async createPartialDepositCheckout(
    params: CreatePartialDepositCheckoutParams,
  ): Promise<{ checkoutId: string }> {
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        stripePaymentIntentId: params.paymentIntentId,
        deletedAt: null,
      },
      select: { invoiceId: true },
    });
    if (existingPayment) {
      return { checkoutId: existingPayment.invoiceId };
    }

    const existingCheckout = await this.prisma.invoice.findFirst({
      where: {
        businessId: params.businessId,
        appointmentId: params.appointmentId,
        kind: InvoiceKind.CHECKOUT,
        status: InvoiceStatus.OPEN,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existingCheckout) {
      return { checkoutId: existingCheckout.id };
    }

    const servicePrice = new Prisma.Decimal(params.servicePrice);
    const depositAmount = new Prisma.Decimal(params.depositAmount);
    const balanceDue = servicePrice.sub(depositAmount);
    const now = new Date();
    const { invoiceNumber, displaySequence } =
      await this.financialSettingsService.allocateCheckoutNumber(
        params.businessId,
      );

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          business: { connect: { id: params.businessId } },
          contact: { connect: { id: params.contactId } },
          appointment: { connect: { id: params.appointmentId } },
          kind: InvoiceKind.CHECKOUT,
          invoiceNumber,
          displaySequence,
          publicToken: generateInvoicePublicToken(),
          status: InvoiceStatus.OPEN,
          paymentStatus: InvoicePaymentStatus.PARTIALLY_PAID,
          issueDate: now,
          subtotal: servicePrice,
          taxAmount: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: servicePrice,
          balanceDue,
          remainingAmount: balanceDue,
          paidAmount: depositAmount,
          lastPaymentAt: now,
          items: {
            create: [
              {
                lineType: InvoiceLineType.SERVICE,
                service: { connect: { id: params.serviceId } },
                ...(params.staffUserId
                  ? { staffUser: { connect: { id: params.staffUserId } } }
                  : {}),
                title: params.serviceName,
                quantity: new Prisma.Decimal(1),
                unitPrice: servicePrice,
                totalPrice: servicePrice,
                sortOrder: 0,
              },
            ],
          },
        },
      });

      await tx.payment.create({
        data: {
          business: { connect: { id: params.businessId } },
          invoice: { connect: { id: created.id } },
          contact: { connect: { id: params.contactId } },
          payableType: PayableType.INVOICE,
          payableId: created.id,
          amount: depositAmount,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.SUCCEEDED,
          provider: PaymentProvider.STRIPE,
          reference: params.paymentIntentId,
          stripePaymentIntentId: params.paymentIntentId,
          ...(params.chargeId ? { stripeChargeId: params.chargeId } : {}),
          paidAt: now,
          ...(params.currency
            ? { providerMetadata: { currency: params.currency } }
            : {}),
        },
      });

      return created;
    });

    return { checkoutId: invoice.id };
  }
}
