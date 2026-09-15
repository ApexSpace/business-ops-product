import { api } from "@/lib/api/client";
import type {
  FormFieldCategory,
  FormFieldTypeMetadata,
  FormMetadataFilters,
  FormPaletteCategory,
} from "@/features/forms/types/metadata";
import { DEFAULT_FORMS_API_BASE } from "@/features/forms/api/forms.api";

function toSearchParams(filters: FormMetadataFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.categories) params.categories = filters.categories;
  if (filters.status) params.status = filters.status;
  if (filters.search?.trim()) params.search = filters.search.trim();
  return params;
}

function metadataPath(apiBase: string, segment: string) {
  return `${apiBase}/metadata/${segment}`;
}

export function listFormFieldCategories(
  apiBase: string = DEFAULT_FORMS_API_BASE,
) {
  return api.get<FormFieldCategory[]>(metadataPath(apiBase, "categories"));
}

export function listFormFieldTypes(
  filters?: FormMetadataFilters,
  apiBase: string = DEFAULT_FORMS_API_BASE,
) {
  return api.get<FormFieldTypeMetadata[]>(metadataPath(apiBase, "field-types"), {
    searchParams: toSearchParams(filters),
  });
}

export function listFormFieldPalette(
  filters?: FormMetadataFilters,
  apiBase: string = DEFAULT_FORMS_API_BASE,
) {
  return api.get<FormPaletteCategory[]>(metadataPath(apiBase, "palette"), {
    searchParams: toSearchParams(filters),
  });
}
