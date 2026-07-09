import {
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import {
  InvoiceKind,
  InvoiceStatus,
  PayableType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { CheckoutCompletionService } from '@app/modules/finance/invoices/services/checkout-completion.service';
import { PaymentRealtimeService } from '../services/payment-realtime.service';
import { PayableHandlerRegistry } from '../registry/payable-handler.registry';
import { computeInvoicePaymentSyncFields } from '../utils/invoice-payment-sync.util';
import type {
  PayableHandler,
  PayableSnapshot,
  PaymentCompleteContext,
} from '../types/payable.types';

@Injectable()
export class InvoicePayableHandler implements PayableHandler, OnModuleInit {
  readonly payableType = PayableType.INVOICE;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CheckoutCompletionService))
    private readonly checkoutCompletion: CheckoutCompletionService,
    private readonly paymentRealtime: PaymentRealtimeService,
    private readonly registry: PayableHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async resolvePayable(
    businessId: string,
    payableId: string,
  ): Promise<PayableSnapshot> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: payableId, businessId, deletedAt: null },
      include: {
        business: {
          select: {
            settings: true,
          },
        },
      },
    });
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_PAYABLE,
        'Invoice is void',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      invoice.kind === InvoiceKind.CHECKOUT &&
      invoice.status !== InvoiceStatus.OPEN &&
      invoice.status !== InvoiceStatus.PARTIAL
    ) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_PAYABLE,
        'Sale is not open for payment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const settings = invoice.business.settings as Record<
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

    return {
      amountDue: invoice.balanceDue.toFixed(2),
      contactId: invoice.contactId,
      description:
        invoice.kind === InvoiceKind.CHECKOUT && invoice.displaySequence
          ? `Sale #${invoice.displaySequence}`
          : `Invoice ${invoice.invoiceNumber}`,
      currency,
      invoiceId: invoice.id,
    };
  }

  async syncPayablePayments(
    businessId: string,
    payableId: string,
  ): Promise<void> {
    await this.syncInvoicePayments(businessId, payableId);
  }

  async onPaymentComplete(ctx: PaymentCompleteContext): Promise<void> {
    await this.syncInvoicePayments(ctx.businessId, ctx.payableId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: ctx.payableId, businessId: ctx.businessId, deletedAt: null },
      select: { kind: true },
    });
    if (invoice?.kind === InvoiceKind.CHECKOUT) {
      await this.checkoutCompletion.finalizeCheckoutIfPaid(
        ctx.businessId,
        ctx.payableId,
        ctx.actorUserId,
      );
      const closed = await this.prisma.invoice.findFirst({
        where: {
          id: ctx.payableId,
          businessId: ctx.businessId,
          deletedAt: null,
        },
        select: { closedAt: true, contactId: true },
      });
      if (closed?.closedAt) {
        await this.paymentRealtime.publishCheckoutClosed(ctx.businessId, {
          checkoutId: ctx.payableId,
          contactId: closed.contactId,
        });
      }
    }
  }

  private async syncInvoicePayments(
    businessId: string,
    invoiceId: string,
  ): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, businessId, deletedAt: null },
    });
    if (!invoice) return;

    const payments = await this.prisma.payment.findMany({
      where: {
        businessId,
        invoiceId,
        deletedAt: null,
        status: 'SUCCEEDED',
        paidAt: { not: null },
      },
      select: { amount: true, paidAt: true },
    });

    const fields = computeInvoicePaymentSyncFields(
      invoice,
      payments.map((p) => ({ amount: p.amount, paidAt: p.paidAt! })),
    );

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: fields,
    });
  }
}
