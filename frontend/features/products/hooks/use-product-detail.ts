"use client";

import { useQuery } from "@tanstack/react-query";
import { getProduct } from "@/features/products/api/products.api";
import { queryKeys } from "@/lib/query/keys";

export function useProductDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ""),
    queryFn: () => getProduct(id!),
    enabled: !!id,
  });
}
