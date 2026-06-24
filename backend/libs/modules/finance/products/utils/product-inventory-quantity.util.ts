import { ProductInventoryAdjustmentType } from '@prisma/client';

export class ProductInventoryQuantityError extends Error {
  constructor(readonly code: 'ZERO' | 'INVALID_RECOUNT') {
    super(code);
  }
}

/** Normalizes user-facing quantity input into a stock delta (or recount target). */
export function normalizeProductInventoryQuantityChange(
  type: ProductInventoryAdjustmentType,
  quantityChange: number,
): number {
  if (type === ProductInventoryAdjustmentType.RECOUNT) {
    if (!Number.isInteger(quantityChange) || quantityChange < 0) {
      throw new ProductInventoryQuantityError('INVALID_RECOUNT');
    }
    return quantityChange;
  }

  if (quantityChange === 0) {
    throw new ProductInventoryQuantityError('ZERO');
  }

  if (
    type === ProductInventoryAdjustmentType.SALE &&
    quantityChange > 0
  ) {
    return -Math.abs(quantityChange);
  }
  if (
    type === ProductInventoryAdjustmentType.PROFESSIONAL_USE &&
    quantityChange > 0
  ) {
    return -Math.abs(quantityChange);
  }
  if (
    type === ProductInventoryAdjustmentType.RECEIVED &&
    quantityChange < 0
  ) {
    return Math.abs(quantityChange);
  }
  if (
    type === ProductInventoryAdjustmentType.RETURNED &&
    quantityChange < 0
  ) {
    return Math.abs(quantityChange);
  }
  return quantityChange;
}
