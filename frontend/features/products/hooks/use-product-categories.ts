"use client";

import { useQuery } from "@tanstack/react-query";
import { listProductCategories } from "@/features/products/api/products.api";
import { queryKeys } from "@/lib/query/keys";

export function useProductCategories() {
  return useQuery({
    queryKey: queryKeys.products.categories(),
    queryFn: listProductCategories,
  });
}
