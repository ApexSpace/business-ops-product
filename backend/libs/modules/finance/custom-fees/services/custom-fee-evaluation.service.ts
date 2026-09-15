import { Injectable } from '@nestjs/common';
import {
  CustomFeeApplicationScope,
  InvoiceLineType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import type { CheckoutItemInput } from '@app/modules/finance/invoices/repositories/checkout.repository';
import { CustomFeeRepository } from '../repositories/custom-fee.repository';
import {
  applyEntireSaleFees,
  applyPaymentMethodFees,
  readCustomFeeIdFromMetadata,
  readPaymentMethodFromFeeMetadata,
  type CustomFeeLike,
} from '../utils/custom-fee-calculations.util';

export type CustomFeeMergeResult = {
  items: CheckoutItemInput[];
  merchandiseSubtotal: Prisma.Decimal;
  feeSubtotal: Prisma.Decimal;
};

@Injectable()
export class CustomFeeEvaluationService {
  constructor(private readonly repository: CustomFeeRepository) {}

  async listEnabledFees(businessId: string): Promise<CustomFeeLike[]> {
    return this.repository.findEnabled(businessId);
  }

  isSystemManagedFeeItem(metadata: Prisma.JsonValue | null | undefined): boolean {
    return readCustomFeeIdFromMetadata(metadata) != null;
  }

  splitCheckoutItems(items: CheckoutItemInput[]): {
    merchandiseItems: CheckoutItemInput[];
    manualCustomItems: CheckoutItemInput[];
    systemFeeItems: CheckoutItemInput[];
  } {
    const merchandiseItems: CheckoutItemInput[] = [];
    const manualCustomItems: CheckoutItemInput[] = [];
    const systemFeeItems: CheckoutItemInput[] = [];

    for (const item of items) {
      const feeId = readCustomFeeIdFromMetadata(
        item.metadata as Prisma.JsonValue | null,
      );
      if (feeId) {
        systemFeeItems.push(item);
        continue;
      }
      if (item.lineType === InvoiceLineType.CUSTOM) {
        manualCustomItems.push(item);
        continue;
      }
      merchandiseItems.push(item);
    }

    return { merchandiseItems, manualCustomItems, systemFeeItems };
  }

  sumItemTotals(items: CheckoutItemInput[]): Prisma.Decimal {
    return items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Prisma.Decimal(0),
    );
  }

  buildFeeLineItem(params: {
    feeId: string;
    name: string;
    amount: Prisma.Decimal;
    sortOrder: number;
    paymentMethod?: PaymentMethod;
    scope: CustomFeeApplicationScope;
  }): CheckoutItemInput {
    const amount = params.amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return {
      lineType: InvoiceLineType.CUSTOM,
      title: params.name,
      description: null,
      quantity: new Prisma.Decimal(1),
      unitPrice: amount,
      totalPrice: amount,
      sortOrder: params.sortOrder,
      metadata: {
        customFeeId: params.feeId,
        customFeeScope: params.scope,
        ...(params.paymentMethod ? { paymentMethod: params.paymentMethod } : {}),
      },
    };
  }

  async mergeEntireSaleFeeItems(
    businessId: string,
    items: CheckoutItemInput[],
  ): Promise<CustomFeeMergeResult> {
    const { merchandiseItems, manualCustomItems, systemFeeItems } =
      this.splitCheckoutItems(items);
    const merchandiseSubtotal = this.sumItemTotals(merchandiseItems).add(
      this.sumItemTotals(manualCustomItems),
    );

    const fees = await this.listEnabledFees(businessId);
    const entireSaleLines = applyEntireSaleFees(fees, merchandiseSubtotal);

    const existingEntireSale = systemFeeItems.filter(
      (item) =>
        readPaymentMethodFromFeeMetadata(
          item.metadata as Prisma.JsonValue | null,
        ) == null &&
        (item.metadata as Record<string, unknown> | undefined)?.customFeeScope !==
          CustomFeeApplicationScope.PAYMENT_METHOD,
    );

    const paymentMethodFeeItems = systemFeeItems.filter(
      (item) =>
        (item.metadata as Record<string, unknown> | undefined)?.customFeeScope ===
        CustomFeeApplicationScope.PAYMENT_METHOD,
    );

    let sortOrder = merchandiseItems.length + manualCustomItems.length;
    const rebuiltEntireSaleItems = entireSaleLines.map((line) =>
      this.buildFeeLineItem({
        feeId: line.feeId,
        name: line.name,
        amount: line.amount,
        sortOrder: sortOrder++,
        scope: CustomFeeApplicationScope.ENTIRE_SALE,
      }),
    );

    void existingEntireSale;

    const mergedItems = [
      ...merchandiseItems.map((item, index) => ({ ...item, sortOrder: index })),
      ...manualCustomItems.map((item, index) => ({
        ...item,
        sortOrder: merchandiseItems.length + index,
      })),
      ...rebuiltEntireSaleItems,
      ...paymentMethodFeeItems.map((item, index) => ({
        ...item,
        sortOrder: sortOrder + index,
      })),
    ];

    const feeSubtotal = this.sumItemTotals([
      ...rebuiltEntireSaleItems,
      ...paymentMethodFeeItems,
    ]);

    return {
      items: mergedItems,
      merchandiseSubtotal,
      feeSubtotal,
    };
  }

  async buildPaymentMethodFeeItems(
    businessId: string,
    tenders: Array<{ method: PaymentMethod; amount: number }>,
    startingSortOrder: number,
  ): Promise<{ items: CheckoutItemInput[]; surchargeByMethod: Map<PaymentMethod, Prisma.Decimal> }> {
    const fees = await this.listEnabledFees(businessId);
    const items: CheckoutItemInput[] = [];
    const surchargeByMethod = new Map<PaymentMethod, Prisma.Decimal>();
    let sortOrder = startingSortOrder;

    for (const tender of tenders) {
      const lines = applyPaymentMethodFees(fees, tender.method, tender.amount);
      let methodTotal = new Prisma.Decimal(0);
      for (const line of lines) {
        methodTotal = methodTotal.add(line.amount);
        items.push(
          this.buildFeeLineItem({
            feeId: line.feeId,
            name: line.name,
            amount: line.amount,
            sortOrder: sortOrder++,
            paymentMethod: tender.method,
            scope: CustomFeeApplicationScope.PAYMENT_METHOD,
          }),
        );
      }
      if (methodTotal.gt(0)) {
        surchargeByMethod.set(tender.method, methodTotal);
      }
    }

    return { items: items, surchargeByMethod };
  }
}
