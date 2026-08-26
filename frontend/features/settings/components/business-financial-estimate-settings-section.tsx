"use client";

import type { UseFormReturn } from "react-hook-form";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { SettingsFormGrid } from "@/components/forms/settings-form-grid";
import { TextField } from "@/components/forms/text-field";
import { SETTINGS_FORM_GRID_SPAN_CLASS } from "@/lib/design/settings-form-tokens";
import type { FinancialSettingsFormValues } from "@/features/settings/schemas/financial-settings-profile";

export function BusinessFinancialEstimateSettingsSection({
  form,
  canEdit,
  estimatePreview,
}: {
  form: UseFormReturn<FinancialSettingsFormValues>;
  canEdit: boolean;
  estimatePreview: string;
}) {
  return (
    <div className="space-y-[var(--spacing-4)]">
      <p className="text-caption">
        Defaults applied when creating new estimates. Business details and tax
        settings are managed in Business Details.
      </p>
      <SettingsFormGrid>
        <TextField
          control={form.control}
          name="estimate.prefix"
          label="Estimate prefix"
          maxLength={10}
          inputClassName="uppercase"
          disabled={!canEdit}
        />
        <div>
          <TextField
            control={form.control}
            name="estimate.nextNumber"
            label="Next estimate number"
            type="number"
            valueAsNumber
            disabled={!canEdit}
          />
          <p className="mt-[var(--spacing-2)] text-sm text-muted-foreground">
            Preview: {estimatePreview}
          </p>
        </div>
        <TextField
          control={form.control}
          name="estimate.defaultExpiryDays"
          label="Default expiry days"
          type="number"
          valueAsNumber
          disabled={!canEdit}
        />
        <TextField
          control={form.control}
          name="estimate.defaultNotes"
          label="Default notes"
          multiline
          rows={3}
          disabled={!canEdit}
          className={SETTINGS_FORM_GRID_SPAN_CLASS}
        />
        <TextField
          control={form.control}
          name="estimate.defaultTermsAndConditions"
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
          name="estimate.showLogo"
          label="Show logo"
          disabled={!canEdit}
        />
        <CheckboxField
          control={form.control}
          name="estimate.showBusinessAddress"
          label="Show business address"
          disabled={!canEdit}
        />
      </div>
    </div>
  );
}
