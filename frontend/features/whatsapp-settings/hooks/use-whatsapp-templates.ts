"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getWhatsAppTemplate,
  getWhatsAppTemplateOptions,
  listWhatsAppTemplates,
  type WhatsAppTemplatesListFilters,
} from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import { queryKeys } from "@/lib/query/keys";

export function useWhatsAppTemplateOptions() {
  return useQuery({
    queryKey: queryKeys.whatsappSettings.templates.options(),
    queryFn: () => getWhatsAppTemplateOptions(),
    staleTime: 60_000,
  });
}

export function useWhatsAppTemplates(filters: WhatsAppTemplatesListFilters) {
  return useQuery({
    queryKey: queryKeys.whatsappSettings.templates.list(
      filters as Record<string, unknown>,
    ),
    queryFn: () => listWhatsAppTemplates(filters),
  });
}

export function useWhatsAppTemplate(id: string | null) {
  return useQuery({
    queryKey: queryKeys.whatsappSettings.templates.detail(id ?? ""),
    queryFn: () => getWhatsAppTemplate(id!),
    enabled: Boolean(id),
  });
}
