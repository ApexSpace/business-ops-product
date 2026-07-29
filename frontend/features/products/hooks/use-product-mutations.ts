"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createProduct,
  createProductCategory,
  createProductInventoryAdjustment,
  deleteProduct,
  deleteProductCategory,
  exportProductsCsv,
  reorderProductCategories,
  updateProduct,
  updateProductCategory,
} from "@/features/products/api/products.api";
import type { ProductInventoryAdjustmentType } from "@/features/products/types";
import {
  invalidateProductCategories,
  invalidateProductDetail,
  invalidateProductLists,
} from "@/lib/query/invalidation";

export function useProductMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => createProduct(body),
    onSuccess: (product) => {
      toast.success("Product created");
      void invalidateProductLists(queryClient);
      void invalidateProductDetail(queryClient, product.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => updateProduct(id, body),
    onSuccess: (product) => {
      toast.success("Product updated");
      void invalidateProductLists(queryClient);
      void invalidateProductDetail(queryClient, product.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Product deleted");
      void invalidateProductLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const adjustInventory = useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: string;
      body: {
        variantId?: string;
        type: ProductInventoryAdjustmentType;
        quantityChange: number;
        note?: string;
      };
    }) => createProductInventoryAdjustment(productId, body),
    onSuccess: (_data, vars) => {
      toast.success("Inventory adjusted");
      void invalidateProductLists(queryClient);
      void invalidateProductDetail(queryClient, vars.productId);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const exportCsv = useMutation({
    mutationFn: exportProductsCsv,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "products.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createCategory = useMutation({
    mutationFn: (body: { name: string; isNonRetail?: boolean }) =>
      createProductCategory(body),
    onSuccess: () => {
      toast.success("Category created");
      void invalidateProductCategories(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCategory = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => updateProductCategory(id, body),
    onSuccess: () => {
      toast.success("Category updated");
      void invalidateProductCategories(queryClient);
      void invalidateProductLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeCategory = useMutation({
    mutationFn: (id: string) => deleteProductCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      void invalidateProductCategories(queryClient);
      void invalidateProductLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderCategories = useMutation({
    mutationFn: (orderedIds: string[]) => reorderProductCategories(orderedIds),
    onSuccess: () => {
      toast.success("Categories reordered");
      void invalidateProductCategories(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    create,
    update,
    remove,
    adjustInventory,
    exportCsv,
    createCategory,
    updateCategory,
    removeCategory,
    reorderCategories,
  };
}
