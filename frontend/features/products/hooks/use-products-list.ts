"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProducts } from "@/features/products/api/products.api";
import type { ListProductsFilters } from "@/features/products/types";
import { queryKeys } from "@/lib/query/keys";

export function useProductsList(filters: ListProductsFilters) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => listProducts(filters),
    placeholderData: keepPreviousData,
  });
}
