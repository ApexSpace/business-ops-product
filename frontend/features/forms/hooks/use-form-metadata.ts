"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listFormFieldCategories,
  listFormFieldPalette,
  listFormFieldTypes,
} from "@/features/forms/api/metadata.api";
import type { FormMetadataFilters, FormFieldTypeMetadata } from "@/features/forms/types/metadata";
import { queryKeys, type ListFilters } from "@/lib/query/keys";

function metadataFilters(
  filters?: FormMetadataFilters,
): ListFilters | undefined {
  return filters as ListFilters | undefined;
}

export function useFormFieldCategories() {
  return useQuery({
    queryKey: queryKeys.forms.categories(),
    queryFn: () => listFormFieldCategories(),
    staleTime: 5 * 60_000,
  });
}

export function useFormFieldTypes(filters?: FormMetadataFilters) {
  return useQuery({
    queryKey: queryKeys.forms.fieldTypes(metadataFilters(filters)),
    queryFn: () => listFormFieldTypes(filters),
    staleTime: 5 * 60_000,
  });
}

export function useFormFieldPalette(filters?: FormMetadataFilters) {
  return useQuery({
    queryKey: queryKeys.forms.palette(metadataFilters(filters)),
    queryFn: () => listFormFieldPalette(filters),
    staleTime: 5 * 60_000,
  });
}

export function useFormFieldTypeMap(filters?: FormMetadataFilters) {
  const query = useFormFieldTypes(filters);
  const byKey = useMemo(() => {
    const map = new Map<string, FormFieldTypeMetadata>();
    for (const field of query.data ?? []) {
      map.set(field.key, field);
    }
    return map;
  }, [query.data]);

  return { ...query, byKey };
}
