"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/forms/text-field";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FormDialog } from "@/components/forms/form-dialog";
import type { WhatsAppTemplateDetail } from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import { WhatsAppTemplateBodyField } from "@/features/whatsapp-settings/components/whatsapp-template-body-field";
import { WhatsAppTemplateButtonsField } from "@/features/whatsapp-settings/components/whatsapp-template-buttons-field";
import { WhatsAppTemplateFooterField } from "@/features/whatsapp-settings/components/whatsapp-template-footer-field";
import { WhatsAppTemplateHeaderFields } from "@/features/whatsapp-settings/components/whatsapp-template-header-fields";
import { WhatsAppTemplateLanguageSelect } from "@/features/whatsapp-settings/components/whatsapp-template-language-select";
import { WhatsAppTemplatePreview } from "@/features/whatsapp-settings/components/whatsapp-template-preview";
import { useWhatsAppTemplateMutations } from "@/features/whatsapp-settings/hooks/use-whatsapp-template-mutations";
import { useWhatsAppTemplateOptions } from "@/features/whatsapp-settings/hooks/use-whatsapp-templates";
import {
  whatsappTemplateFormDefaults,
  whatsappTemplateFormSchema,
  type WhatsAppTemplateFormValues,
} from "@/features/whatsapp-settings/schemas/whatsapp-template.schema";
import {
  componentsToFormValues,
  normalizeTemplateNameInput,
} from "@/features/whatsapp-settings/utils/whatsapp-template-components.util";
import { renderTemplatePreview } from "@/features/whatsapp-settings/utils/whatsapp-template-preview.util";

export interface WhatsAppTemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  template?: WhatsAppTemplateDetail | null;
}

export function WhatsAppTemplateEditorDialog({
  open,
  onOpenChange,
  mode,
  template,
}: WhatsAppTemplateEditorDialogProps) {
  const { data: options } = useWhatsAppTemplateOptions();
  const { createMutation, updateMutation } = useWhatsAppTemplateMutations();
  const [headerFile, setHeaderFile] = useState<File | null>(null);

  const form = useForm<WhatsAppTemplateFormValues>({
    resolver: zodResolver(whatsappTemplateFormSchema),
    defaultValues: whatsappTemplateFormDefaults,
  });

  const values = form.watch();
  const preview = useMemo(() => renderTemplatePreview(values), [values]);
  const isEdit = mode === "edit";
  const hasMediaHeader =
    values.headerType === "image" ||
    values.headerType === "video" ||
    values.headerType === "document";

  useEffect(() => {
    if (!open) {
      form.reset(whatsappTemplateFormDefaults);
      setHeaderFile(null);
      return;
    }

    if (isEdit && template) {
      form.reset(
        componentsToFormValues(template.components, {
          name: template.name,
          language: template.language,
          category: template.category,
        }),
      );
      setHeaderFile(null);
      return;
    }

    form.reset(whatsappTemplateFormDefaults);
    setHeaderFile(null);
  }, [open, isEdit, template, form]);

  const categoryItems =
    options?.categories.map((category) => ({
      value: category.value,
      label: category.label,
    })) ?? [];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit template" : "Create template"}
      description="Templates are submitted to Meta immediately and enter Pending review."
      form={form}
      schema={whatsappTemplateFormSchema}
      size="2xl"
      isPending={isPending}
      submitLabel={isEdit ? "Save and resubmit" : "Submit to Meta"}
      onSubmit={(formValues) => {
        const normalizedValues = {
          ...formValues,
          name: normalizeTemplateNameInput(formValues.name),
        };

        if (isEdit && template) {
          updateMutation.mutate(
            { id: template.id, values: normalizedValues },
            { onSuccess: () => onOpenChange(false) },
          );
          return;
        }

        createMutation.mutate(
          { values: normalizedValues, headerFile },
          { onSuccess: () => onOpenChange(false) },
        );
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="space-y-5">
          <TextField
            control={form.control}
            name="name"
            label="Template name"
            placeholder="order_update"
            disabled={isEdit}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Language
              </label>
              <WhatsAppTemplateLanguageSelect
                value={values.language}
                onValueChange={(language) =>
                  form.setValue("language", language, { shouldDirty: true })
                }
                disabled={isEdit}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Category
              </label>
              <SearchableSelect
                items={categoryItems}
                value={values.category}
                onValueChange={(category) =>
                  form.setValue(
                    "category",
                    (category ?? "UTILITY") as WhatsAppTemplateFormValues["category"],
                    { shouldDirty: true },
                  )
                }
                searchable={false}
                triggerClassName="w-full"
              />
            </div>
          </div>

          <WhatsAppTemplateHeaderFields
            control={form.control}
            headerType={values.headerType}
            onHeaderTypeChange={(headerType) =>
              form.setValue("headerType", headerType, { shouldDirty: true })
            }
            headerFile={headerFile}
            onHeaderFileChange={setHeaderFile}
            readOnlyMedia={isEdit && hasMediaHeader}
            disableTypeChange={isEdit}
          />

          <WhatsAppTemplateBodyField control={form.control} />
          <WhatsAppTemplateFooterField control={form.control} />
          <WhatsAppTemplateButtonsField
            control={form.control}
            setValue={form.setValue}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Live preview</p>
          <WhatsAppTemplatePreview preview={preview} />
        </div>
      </div>
    </FormDialog>
  );
}
