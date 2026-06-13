"use client";

import type { Control } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import type { WhatsAppTemplateFormValues } from "@/features/whatsapp-settings/schemas/whatsapp-template.schema";

export interface WhatsAppTemplateBodyFieldProps {
  control: Control<WhatsAppTemplateFormValues>;
}

export function WhatsAppTemplateBodyField({
  control,
}: WhatsAppTemplateBodyFieldProps) {
  return (
    <div className="space-y-2">
      <TextField
        control={control}
        name="bodyText"
        label="Body"
        placeholder="Hello {{1}}, your order is ready."
        multiline
        rows={5}
      />
      <p className="text-xs text-muted-foreground">
        Use positional variables like {"{{1}}"}, {"{{2}}"} for dynamic values.
      </p>
    </div>
  );
}
