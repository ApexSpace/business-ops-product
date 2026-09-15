type ProductPriceFields = {
  unitPrice: { toString(): string };
  sku?: string | null;
};

type VariantPriceFields = {
  price?: { toString(): string } | null;
  sku?: string | null;
};

export function resolveProductPrice(
  product: ProductPriceFields,
  variant?: VariantPriceFields | null,
): string {
  if (variant?.price != null) {
    return variant.price.toString();
  }
  return product.unitPrice.toString();
}

export function resolveProductSku(
  product: ProductPriceFields,
  variant?: VariantPriceFields | null,
): string | null {
  if (variant?.sku) {
    return variant.sku;
  }
  return product.sku ?? null;
}
