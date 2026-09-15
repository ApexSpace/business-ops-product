"use client";

import { SearchableSelect } from "@/components/forms/searchable-select";
import { useWhatsAppTemplateOptions } from "@/features/whatsapp-settings/hooks/use-whatsapp-templates";

export interface WhatsAppTemplateLanguageSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function WhatsAppTemplateLanguageSelect({
  value,
  onValueChange,
  disabled = false,
}: WhatsAppTemplateLanguageSelectProps) {
  const { data } = useWhatsAppTemplateOptions();
  const items =
    data?.languages.map((language) => ({
      value: language.code,
      label: `${language.label} (${language.code})`,
    })) ?? [];

  return (
    <SearchableSelect
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(next ?? "en_US")}
      disabled={disabled || items.length === 0}
      placeholder="Select language"
      triggerClassName="w-full"
    />
  );
}
