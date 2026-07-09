import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  ContactWalletTransactionType,
  InvoiceKind,
  InvoiceLineType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { GiftCardsService } from '@app/modules/finance/gift-cards/services/gift-cards.service';
import { ClientPackagesService } from '@app/modules/finance/packages/services/client-packages.service';
import { ClientMembershipsService } from '@app/modules/finance/memberships/services/client-memberships.service';
import { CheckoutOffersService } from './checkout-offers.service';
import { ProductInventoryService } from '@app/modules/finance/products/services/product-inventory.service';
import { WalletLedgerService } from '@app/modules/finance/payments/services/wallet-ledger.service';

@Injectable()
export class CheckoutCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletLedger: WalletLedgerService,
    private readonly productInventory: ProductInventoryService,
    private readonly giftCardsService: GiftCardsService,
    private readonly clientPackagesService: ClientPackagesService,
    private readonly clientMembershipsService: ClientMembershipsService,
    private readonly checkoutOffersService: CheckoutOffersService,
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
    await this.applyGiftCardSales(checkout);
    await this.applyPackageSales(checkout);
    await this.applyMembershipRedemptions(checkout);
    await this.applyOfferUsage(checkout);

    await this.prisma.invoice.update({
      where: { id: checkout.id },
      data: {
        status: InvoiceStatus.PAID,
        closedAt: checkout.closedAt ?? new Date(),
        closedById: checkout.closedById ?? actorUserId ?? null,
      },
    });

    if (checkout.appointmentId) {
      await this.prisma.appointment.updateMany({
        where: {
          id: checkout.appointmentId,
          businessId,
          deletedAt: null,
          status: AppointmentStatus.IN_SERVICE,
        },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }
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
      items: {
        id: string;
        lineType: InvoiceLineType;
        totalPrice: Prisma.Decimal;
        title: string;
      }[];
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

  private async applyGiftCardSales(checkout: {
    id: string;
    businessId: string;
    contactId: string;
    items: {
      id: string;
      lineType: InvoiceLineType;
      totalPrice: Prisma.Decimal;
      metadata: Prisma.JsonValue;
    }[];
  }): Promise<void> {
    const giftCardLines = checkout.items.filter(
      (item) => item.lineType === InvoiceLineType.GIFT_CARD,
    );
    for (const item of giftCardLines) {
      const meta = (item.metadata ?? {}) as Record<string, unknown>;
      const ownerContactId =
        typeof meta.ownerContactId === 'string' ? meta.ownerContactId : null;
      if (!ownerContactId) continue;

      const lineMarker = `checkoutItem:${item.id}`;
      const existing = await this.prisma.giftCard.findFirst({
        where: {
          businessId: checkout.businessId,
          notes: { contains: lineMarker },
        },
      });
      if (existing) continue;

      const card = await this.giftCardsService.createFromPosSale(
        checkout.businessId,
        checkout.id,
        {
          number:
            typeof meta.giftCardNumber === 'string'
              ? meta.giftCardNumber
              : null,
          initialValue: Number(
            (typeof meta.cardValue === 'number'
              ? meta.cardValue
              : item.totalPrice
            ).toString(),
          ),
          ownerContactId,
          purchasingContactId: checkout.contactId,
          sendDigital: meta.sendDigital === true,
        },
      );

      if (card) {
        await this.prisma.giftCard.updateMany({
          where: { id: card.id, businessId: checkout.businessId },
          data: {
            notes: [card.notes, lineMarker].filter(Boolean).join(' · '),
          },
        });
      }
    }
  }

  private async applyPackageSales(checkout: {
    id: string;
    businessId: string;
    contactId: string;
    items: {
      id: string;
      lineType: InvoiceLineType;
      metadata: Prisma.JsonValue;
    }[];
  }): Promise<void> {
    const packageLines = checkout.items.filter(
      (item) => item.lineType === InvoiceLineType.PACKAGE,
    );
    for (const item of packageLines) {
      const meta = (item.metadata ?? {}) as Record<string, unknown>;
      const packageTemplateId =
        typeof meta.packageTemplateId === 'string'
          ? meta.packageTemplateId
          : null;
      const ownerContactId =
        typeof meta.ownerContactId === 'string' ? meta.ownerContactId : null;
      if (!packageTemplateId || !ownerContactId) continue;

      await this.clientPackagesService.createFromPosSale(
        checkout.businessId,
        checkout.id,
        {
          packageTemplateId,
          ownerContactId,
          isDemo: meta.isDemo === true,
          checkoutItemId: item.id,
        },
      );
    }
  }

  private async applyMembershipRedemptions(checkout: {
    id: string;
    businessId: string;
    items: {
      id: string;
      lineType: InvoiceLineType;
      metadata: Prisma.JsonValue;
    }[];
  }): Promise<void> {
    const serviceLines = checkout.items.filter(
      (item) => item.lineType === InvoiceLineType.SERVICE,
    );
    for (const item of serviceLines) {
      const meta = (item.metadata ?? {}) as Record<string, unknown>;
      if (meta.membershipRedemption !== true) continue;

      const clientMembershipId =
        typeof meta.clientMembershipId === 'string'
          ? meta.clientMembershipId
          : null;
      const membershipServiceGroupId =
        typeof meta.membershipServiceGroupId === 'string'
          ? meta.membershipServiceGroupId
          : null;
      if (!clientMembershipId || !membershipServiceGroupId) continue;

      const existing = await this.prisma.membershipUsageRecord.findFirst({
        where: { saleLineItemId: item.id },
      });
      if (existing) continue;

      await this.clientMembershipsService.redeemServiceAtCheckout(
        checkout.businessId,
        clientMembershipId,
        {
          serviceGroupId: membershipServiceGroupId,
          saleLineItemId: item.id,
        },
      );
    }
  }

  private async applyOfferUsage(checkout: {
    id: string;
    businessId: string;
    contactId: string;
    metadata: Prisma.JsonValue;
  }): Promise<void> {
    const metadata = this.checkoutOffersService.parseMetadata(
      checkout.metadata,
    );
    if (!metadata.appliedOffers?.length) return;

    const existing = await this.prisma.offerUsageLog.count({
      where: { saleId: checkout.id },
    });
    if (existing > 0) return;

    await this.checkoutOffersService.recordAppliedOffersOnClose(
      checkout.businessId,
      checkout.id,
      checkout.contactId,
      metadata,
    );
  }
}
