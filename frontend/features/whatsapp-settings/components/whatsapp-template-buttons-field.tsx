"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Control, UseFormSetValue } from "react-hook-form";
import { useFieldArray, useWatch } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import { useWhatsAppTemplateOptions } from "@/features/whatsapp-settings/hooks/use-whatsapp-templates";
import type { WhatsAppTemplateFormValues } from "@/features/whatsapp-settings/schemas/whatsapp-template.schema";

export interface WhatsAppTemplateButtonsFieldProps {
  control: Control<WhatsAppTemplateFormValues>;
  setValue: UseFormSetValue<WhatsAppTemplateFormValues>;
}

export function WhatsAppTemplateButtonsField({
  control,
  setValue,
}: WhatsAppTemplateButtonsFieldProps) {
  const { data } = useWhatsAppTemplateOptions();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "buttons",
  });

  const buttonTypeItems =
    data?.buttonTypes.map((item) => ({
      value: item.value,
      label: item.label,
    })) ?? [];

  const buttons = useWatch({ control, name: "buttons" }) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground">Buttons</label>
        <ActionButton
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= 3}
          onClick={() =>
            append({ type: "QUICK_REPLY", text: "", url: "", phone_number: "" })
          }
        >
          <Plus className="mr-2 size-4" />
          Add button
        </ActionButton>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Optional quick replies or call-to-action buttons (max 3).
        </p>
      ) : null}

      {fields.map((field, index) => {
        const buttonType = buttons[index]?.type ?? "QUICK_REPLY";

        return (
          <div
            key={field.id}
            className="space-y-3 rounded-lg border border-border/70 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Button type
                  </label>
                  <SearchableSelect
                    items={buttonTypeItems}
                    value={buttonType}
                    onValueChange={(value) =>
                      setValue(
                        `buttons.${index}.type`,
                        (value ?? "QUICK_REPLY") as WhatsAppTemplateFormValues["buttons"][number]["type"],
                        { shouldDirty: true },
                      )
                    }
                    searchable={false}
                    triggerClassName="w-full"
                  />
                </div>
                <TextField
                  control={control}
                  name={`buttons.${index}.text`}
                  label="Button label"
                  placeholder="Shop now"
                />
                {buttonType === "URL" ? (
                  <TextField
                    control={control}
                    name={`buttons.${index}.url`}
                    label="Website URL"
                    placeholder="https://example.com"
                  />
                ) : null}
                {buttonType === "PHONE_NUMBER" ? (
                  <TextField
                    control={control}
                    name={`buttons.${index}.phone_number`}
                    label="Phone number"
                    placeholder="+15551234567"
                  />
                ) : null}
              </div>
              <IconButton
                type="button"
                aria-label="Remove button"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
