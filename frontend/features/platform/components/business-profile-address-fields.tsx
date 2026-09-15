"use client";

import type { UseFormReturn } from "react-hook-form";
import { SelectField } from "@/components/forms/select-field";
import { SettingsFormGrid } from "@/components/forms/settings-form-grid";
import { TextField } from "@/components/forms/text-field";
import { BusinessProfileSectionTitle } from "@/features/platform/components/business-profile-section-title";
import type { BusinessProfileFormValues } from "@/features/settings/schemas/business-profile";
import { countryOptions } from "@/lib/config/geo-options";

export function BusinessProfileAddressFields({
  form,
  disabled,
  showSectionTitle,
}: {
  form: UseFormReturn<BusinessProfileFormValues>;
  disabled: boolean;
  showSectionTitle: boolean;
}) {
  return (
    <section className="space-y-5">
      {showSectionTitle ? (
        <BusinessProfileSectionTitle>Address</BusinessProfileSectionTitle>
      ) : null}
      <SettingsFormGrid>
        <TextField
          control={form.control}
          name="address"
          label="Address line 1"
          placeholder="123 Main St"
          disabled={disabled}
        />
        <TextField
          control={form.control}
          name="addressLine2"
          label="Address line 2"
          placeholder="Suite 100"
          disabled={disabled}
        />
        <TextField
          control={form.control}
          name="city"
          label="City"
          disabled={disabled}
        />
        <TextField
          control={form.control}
          name="state"
          label="State / Province"
          disabled={disabled}
        />
        <SelectField
          control={form.control}
          name="country"
          label="Country"
          items={countryOptions}
          placeholder="Select country"
          disabled={disabled}
        />
        <TextField
          control={form.control}
          name="zip"
          label="ZIP / Postal code"
          disabled={disabled}
        />
      </SettingsFormGrid>
    </section>
  );
}
