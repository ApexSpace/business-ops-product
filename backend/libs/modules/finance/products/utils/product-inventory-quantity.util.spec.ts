import { ProductInventoryAdjustmentType } from '@prisma/client';
import {
  normalizeProductInventoryQuantityChange,
  ProductInventoryQuantityError,
} from './product-inventory-quantity.util';

describe('normalizeProductInventoryQuantityChange', () => {
  it('sets recount target as absolute stock', () => {
    expect(
      normalizeProductInventoryQuantityChange(
        ProductInventoryAdjustmentType.RECOUNT,
        67,
      ),
    ).toBe(67);
  });

  it('subtracts stock for professional use', () => {
    expect(
      normalizeProductInventoryQuantityChange(
        ProductInventoryAdjustmentType.PROFESSIONAL_USE,
        45,
      ),
    ).toBe(-45);
  });

  it('adds stock for received inventory', () => {
    expect(
      normalizeProductInventoryQuantityChange(
        ProductInventoryAdjustmentType.RECEIVED,
        10,
      ),
    ).toBe(10);
  });

  it('adds stock for customer returns', () => {
    expect(
      normalizeProductInventoryQuantityChange(
        ProductInventoryAdjustmentType.RETURNED,
        5,
      ),
    ).toBe(5);
  });

  it('rejects zero delta adjustments', () => {
    expect(() =>
      normalizeProductInventoryQuantityChange(
        ProductInventoryAdjustmentType.RECEIVED,
        0,
      ),
    ).toThrow(ProductInventoryQuantityError);
  });
});
