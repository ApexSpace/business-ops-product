import { z } from "zod";
import type { ProductDetail, ProductType } from "@/features/products/types";

export const productTypeSchema = z.enum(["SIMPLE", "VARIABLE", "BUNDLE"]);

export const productProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(300),
  productType: productTypeSchema,
  categoryId: z.string().uuid().optional().or(z.literal("")),
  brand: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  supplier: z.string().max(200).optional(),
  unitPrice: z.string().optional(),
  unitLabel: z.string().max(50).optional(),
  purchaseCost: z.string().optional(),
  chargeTax: z.boolean(),
  trackInventory: z.boolean(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  desiredQuantity: z.string().optional(),
  stockQuantity: z.string().optional(),
  commissionEnabled: z.boolean(),
  assignStaffToSale: z.boolean(),
  considerAsSalesRevenue: z.boolean(),
  autoAddToNewSales: z.boolean(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

export type ProductProfileFormValues = z.infer<typeof productProfileSchema>;

export const productProfileDefaultValues: ProductProfileFormValues = {
  name: "",
  productType: "SIMPLE",
  categoryId: "",
  brand: "",
  description: "",
  supplier: "",
  unitPrice: "",
  unitLabel: "",
  purchaseCost: "",
  chargeTax: true,
  trackInventory: false,
  sku: "",
  barcode: "",
  desiredQuantity: "",
  stockQuantity: "",
  commissionEnabled: false,
  assignStaffToSale: false,
  considerAsSalesRevenue: true,
  autoAddToNewSales: false,
  status: "ACTIVE",
};

function parseOptionalNumber(value?: string) {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function parseOptionalInt(value?: string) {
  const n = parseOptionalNumber(value);
  if (n === undefined) return undefined;
  return Math.trunc(n);
}

export function productToProfileForm(
  product: ProductDetail,
): ProductProfileFormValues {
  return {
    name: product.name,
    productType: product.productType,
    categoryId: product.categoryId ?? "",
    brand: product.brand ?? "",
    description: product.description ?? "",
    supplier: product.supplier ?? "",
    unitPrice: product.unitPrice ?? "",
    unitLabel: product.unitLabel ?? "",
    purchaseCost: product.purchaseCost ?? "",
    chargeTax: product.chargeTax,
    trackInventory: product.trackInventory,
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    desiredQuantity:
      product.desiredQuantity != null ? String(product.desiredQuantity) : "",
    stockQuantity: String(product.stockQuantity ?? 0),
    commissionEnabled: product.commissionEnabled,
    assignStaffToSale: product.assignStaffToSale,
    considerAsSalesRevenue: product.considerAsSalesRevenue,
    autoAddToNewSales: product.autoAddToNewSales,
    status: product.status,
  };
}

export function profileFormToCreateApiBody(values: ProductProfileFormValues) {
  return {
    name: values.name.trim(),
    productType: values.productType as ProductType,
    categoryId: values.categoryId || undefined,
    brand: values.brand?.trim() || undefined,
    description: values.description?.trim() || undefined,
    supplier: values.supplier?.trim() || undefined,
    unitPrice: parseOptionalNumber(values.unitPrice),
    unitLabel: values.unitLabel?.trim() || undefined,
    purchaseCost: parseOptionalNumber(values.purchaseCost),
    chargeTax: values.chargeTax,
    trackInventory: values.trackInventory,
    sku: values.sku?.trim() || undefined,
    barcode: values.barcode?.trim() || undefined,
    desiredQuantity: parseOptionalInt(values.desiredQuantity),
    stockQuantity: parseOptionalInt(values.stockQuantity),
    commissionEnabled: values.commissionEnabled,
    assignStaffToSale: values.assignStaffToSale,
    considerAsSalesRevenue: values.considerAsSalesRevenue,
    autoAddToNewSales: values.autoAddToNewSales,
    status: values.status,
  };
}

export function profileFormToUpdateApiBody(values: ProductProfileFormValues) {
  const body = profileFormToCreateApiBody(values);
  const { productType: _productType, stockQuantity: _stock, ...rest } = body;
  return {
    ...rest,
    categoryId: values.categoryId || null,
    brand: values.brand?.trim() || null,
    description: values.description?.trim() || null,
    supplier: values.supplier?.trim() || null,
    unitLabel: values.unitLabel?.trim() || null,
    sku: values.sku?.trim() || null,
    barcode: values.barcode?.trim() || null,
    desiredQuantity: parseOptionalInt(values.desiredQuantity) ?? null,
    purchaseCost: parseOptionalNumber(values.purchaseCost) ?? null,
  };
}
