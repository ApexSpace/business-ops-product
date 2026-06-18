import { api } from "@/lib/api/client";
import type {
  FormFieldCategory,
  FormFieldTypeMetadata,
  FormMetadataFilters,
  FormPaletteCategory,
} from "@/features/forms/types/metadata";

function toSearchParams(filters: FormMetadataFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.categories) params.categories = filters.categories;
  if (filters.status) params.status = filters.status;
  if (filters.search?.trim()) params.search = filters.search.trim();
  return params;
}

export function listFormFieldCategories() {
  return api.get<FormFieldCategory[]>("forms/metadata/categories");
}

export function listFormFieldTypes(filters?: FormMetadataFilters) {
  return api.get<FormFieldTypeMetadata[]>("forms/metadata/field-types", {
    searchParams: toSearchParams(filters),
  });
}

export function listFormFieldPalette(filters?: FormMetadataFilters) {
  return api.get<FormPaletteCategory[]>("forms/metadata/palette", {
    searchParams: toSearchParams(filters),
  });
}
