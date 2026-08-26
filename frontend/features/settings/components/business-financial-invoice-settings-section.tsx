"use client";

import type { UseFormReturn } from "react-hook-form";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { SettingsFormGrid } from "@/components/forms/settings-form-grid";
import { TextField } from "@/components/forms/text-field";
import { SETTINGS_FORM_GRID_SPAN_CLASS } from "@/lib/design/settings-form-tokens";
import type { FinancialSettingsFormValues } from "@/features/settings/schemas/financial-settings-profile";

export function BusinessFinancialInvoiceSettingsSection({
  form,
  canEdit,
  invoicePreview,
}: {
  form: UseFormReturn<FinancialSettingsFormValues>;
  canEdit: boolean;
  invoicePreview: string;
}) {
  return (
    <div className="space-y-[var(--spacing-4)]">
      <p className="text-caption">
        Defaults applied when creating new invoices. Business details and tax
        settings are managed in Business Details.
      </p>
      <SettingsFormGrid>
        <TextField
          control={form.control}
          name="invoice.prefix"
          label="Invoice prefix"
          maxLength={10}
          inputClassName="uppercase"
          disabled={!canEdit}
        />
        <div>
          <TextField
            control={form.control}
            name="invoice.nextNumber"
            label="Next invoice number"
            type="number"
            valueAsNumber
            disabled={!canEdit}
          />
          <p className="mt-[var(--spacing-2)] text-sm text-muted-foreground">
            Preview: {invoicePreview}
          </p>
        </div>
        <TextField
          control={form.control}
          name="invoice.defaultPaymentTerms"
          label="Default payment terms"
          placeholder="Net 30"
          description='Used to pre-fill due dates (e.g. "Net 30" → 30 days).'
          disabled={!canEdit}
          className={SETTINGS_FORM_GRID_SPAN_CLASS}
        />
        <TextField
          control={form.control}
          name="invoice.defaultNotes"
          label="Default notes"
          multiline
          rows={3}
          disabled={!canEdit}
          className={SETTINGS_FORM_GRID_SPAN_CLASS}
        />
        <TextField
          control={form.control}
          name="invoice.defaultTermsAndConditions"
          label="Default terms & conditions"
          multiline
          rows={4}
          disabled={!canEdit}
          className={SETTINGS_FORM_GRID_SPAN_CLASS}
        />
      </SettingsFormGrid>
      <div className="space-y-3 rounded-[var(--radius-control)] border border-border/70 p-[var(--spacing-4)]">
        <p className="text-sm font-medium">Document display</p>
        <CheckboxField
          control={form.control}
          name="invoice.showLogo"
          label="Show logo"
          disabled={!canEdit}
        />
        <CheckboxField
          control={form.control}
          name="invoice.showBusinessAddress"
          label="Show business address"
          disabled={!canEdit}
        />
        <CheckboxField
          control={form.control}
          name="invoice.showPaymentInstructions"
          label="Show payment instructions"
          disabled={!canEdit}
        />
      </div>
    </div>
  );
}
