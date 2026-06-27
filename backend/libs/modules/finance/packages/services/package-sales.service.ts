import { Injectable } from '@nestjs/common';
import {
  InvoiceKind,
  InvoiceLineType,
  InvoicePaymentStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import { generateInvoicePublicToken } from '@app/modules/finance/invoices/utils/invoice-public-token.util';

@Injectable()
export class PackageSalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialSettingsService: FinancialSettingsService,
  ) {}

  async recordStaffAssignmentSale(params: {
    businessId: string;
    clientPackageId: string;
    contactId: string;
    title: string;
    amount: Prisma.Decimal;
    actorUserId: string;
  }): Promise<string> {
    const { invoiceNumber, displaySequence } =
      await this.financialSettingsService.allocateCheckoutNumber(
        params.businessId,
      );

    const invoice = await this.prisma.invoice.create({
      data: {
        business: { connect: { id: params.businessId } },
        contact: { connect: { id: params.contactId } },
        kind: InvoiceKind.CHECKOUT,
        invoiceNumber,
        displaySequence,
        publicToken: generateInvoicePublicToken(),
        status: InvoiceStatus.PAID,
        paymentStatus: InvoicePaymentStatus.PAID,
        issueDate: new Date(),
        subtotal: params.amount,
        taxAmount: new Prisma.Decimal(0),
        discountAmount: new Prisma.Decimal(0),
        totalAmount: params.amount,
        balanceDue: new Prisma.Decimal(0),
        remainingAmount: new Prisma.Decimal(0),
        paidAmount: params.amount,
        closedAt: new Date(),
        closedBy: { connect: { id: params.actorUserId } },
        createdBy: { connect: { id: params.actorUserId } },
        items: {
          create: [
            {
              lineType: InvoiceLineType.PACKAGE,
              title: params.title,
              quantity: new Prisma.Decimal(1),
              unitPrice: params.amount,
              totalPrice: params.amount,
              metadata: { clientPackageId: params.clientPackageId },
            },
          ],
        },
      },
    });

    await this.prisma.clientPackage.update({
      where: { id: params.clientPackageId },
      data: { invoiceId: invoice.id },
    });

    return invoice.id;
  }
}
