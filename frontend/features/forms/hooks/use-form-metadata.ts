"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listFormFieldCategories,
  listFormFieldPalette,
  listFormFieldTypes,
} from "@/features/forms/api/metadata.api";
import { useFormsHost } from "@/features/forms/forms-host-context";
import type { FormMetadataFilters, FormFieldTypeMetadata } from "@/features/forms/types/metadata";
import { queryKeys, type ListFilters } from "@/lib/query/keys";

function metadataFilters(
  filters?: FormMetadataFilters,
): ListFilters | undefined {
  return filters as ListFilters | undefined;
}

export function useFormFieldCategories() {
  const { apiBase } = useFormsHost();
  return useQuery({
    queryKey: queryKeys.forms.categories(apiBase),
    queryFn: () => listFormFieldCategories(apiBase),
    staleTime: 5 * 60_000,
  });
}

export function useFormFieldTypes(filters?: FormMetadataFilters) {
  const { apiBase } = useFormsHost();
  return useQuery({
    queryKey: queryKeys.forms.fieldTypes(apiBase, metadataFilters(filters)),
    queryFn: () => listFormFieldTypes(filters, apiBase),
    staleTime: 5 * 60_000,
  });
}

export function useFormFieldPalette(filters?: FormMetadataFilters) {
  const { apiBase } = useFormsHost();
  return useQuery({
    queryKey: queryKeys.forms.palette(apiBase, metadataFilters(filters)),
    queryFn: () => listFormFieldPalette(filters, apiBase),
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
