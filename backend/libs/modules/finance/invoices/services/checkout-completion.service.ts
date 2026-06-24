import { Injectable } from '@nestjs/common';
import {
  ContactWalletTransactionType,
  InvoiceKind,
  InvoiceLineType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { ProductInventoryService } from '@app/modules/finance/products/services/product-inventory.service';
import { WalletLedgerService } from '@app/modules/finance/payments/services/wallet-ledger.service';

@Injectable()
export class CheckoutCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletLedger: WalletLedgerService,
    private readonly productInventory: ProductInventoryService,
  ) {}

  /** Credit wallet deposit lines and mark checkout closed when fully paid. */
  async finalizeCheckoutIfPaid(
    businessId: string,
    invoiceId: string,
    actorUserId?: string,
  ): Promise<void> {
    const checkout = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        businessId,
        kind: InvoiceKind.CHECKOUT,
        deletedAt: null,
      },
      include: { items: true },
    });
    if (!checkout || checkout.status === InvoiceStatus.VOID) {
      return;
    }
    if (checkout.closedAt) {
      return;
    }
    if (checkout.balanceDue.greaterThan(0)) {
      return;
    }

    await this.applyDepositLines(checkout, actorUserId);
    await this.applyProductSales(checkout, actorUserId);

    await this.prisma.invoice.update({
      where: { id: checkout.id },
      data: {
        status: InvoiceStatus.PAID,
        closedAt: checkout.closedAt ?? new Date(),
        closedById: checkout.closedById ?? actorUserId ?? null,
      },
    });
  }

  private async applyProductSales(
    checkout: {
      id: string;
      businessId: string;
      items: {
        id: string;
        lineType: InvoiceLineType;
        productId: string | null;
        variantId: string | null;
        quantity: Prisma.Decimal;
      }[];
    },
    actorUserId?: string,
  ): Promise<void> {
    const productLines = checkout.items.filter(
      (item) =>
        item.lineType === InvoiceLineType.PRODUCT && item.productId != null,
    );
    if (productLines.length === 0) return;

    await this.productInventory.recordCheckoutSales(
      checkout.businessId,
      checkout.id,
      productLines.map((item) => ({
        id: item.id,
        productId: item.productId!,
        variantId: item.variantId,
        quantity: Number(item.quantity.toString()),
      })),
      actorUserId,
    );
  }

  private async applyDepositLines(
    checkout: {
      id: string;
      businessId: string;
      contactId: string;
      items: { id: string; lineType: InvoiceLineType; totalPrice: Prisma.Decimal; title: string }[];
    },
    actorUserId?: string,
  ): Promise<void> {
    const depositItems = checkout.items.filter(
      (item) => item.lineType === InvoiceLineType.ACCOUNT_BALANCE_DEPOSIT,
    );
    if (depositItems.length === 0) {
      return;
    }

    for (const item of depositItems) {
      const existing = await this.prisma.contactWalletTransaction.findFirst({
        where: {
          businessId: checkout.businessId,
          invoiceId: checkout.id,
          type: ContactWalletTransactionType.SALE_DEPOSIT,
          description: { contains: item.id },
        },
      });
      if (existing) continue;

      await this.walletLedger.credit({
        businessId: checkout.businessId,
        contactId: checkout.contactId,
        amount: item.totalPrice,
        type: ContactWalletTransactionType.SALE_DEPOSIT,
        description: `Sale deposit: ${item.title} (${item.id})`,
        invoiceId: checkout.id,
        createdById: actorUserId,
      });
    }
  }
}
