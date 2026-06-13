"use client";

import type { Control } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import type { WhatsAppTemplateFormValues } from "@/features/whatsapp-settings/schemas/whatsapp-template.schema";

export interface WhatsAppTemplateFooterFieldProps {
  control: Control<WhatsAppTemplateFormValues>;
}

export function WhatsAppTemplateFooterField({
  control,
}: WhatsAppTemplateFooterFieldProps) {
  return (
    <TextField
      control={control}
      name="footerText"
      label="Footer (optional)"
      placeholder="Reply STOP to unsubscribe"
    />
  );
}
