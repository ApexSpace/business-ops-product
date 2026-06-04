"use client";

import type { UseFormReturn } from "react-hook-form";
import { PhoneField } from "@/components/forms/phone-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessProfileSectionTitle } from "@/features/platform/components/business-profile-section-title";
import type { BusinessProfileFormValues } from "@/features/settings/schemas/business-profile";
import { businessStatusOptions } from "@/features/platform/utils/select-options";

export function BusinessProfileBusinessFields({
  form,
  disabled,
  showSectionTitle,
  showStatus,
  industriesLoading,
  industryOptions,
}: {
  form: UseFormReturn<BusinessProfileFormValues>;
  disabled: boolean;
  showSectionTitle: boolean;
  showStatus: boolean;
  industriesLoading: boolean;
  industryOptions: { value: string; label: string }[];
}) {
  return (
    <section className="space-y-4">
      {showSectionTitle ? (
        <BusinessProfileSectionTitle>Business</BusinessProfileSectionTitle>
      ) : null}
      <TextField
        control={form.control}
        name="name"
        label="Legal business name"
        placeholder="ABC Med Spa"
        disabled={disabled}
      />
      {industriesLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : industryOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No industries configured. Ask a platform admin to add industries
          under Platform → Industries.
        </p>
      ) : (
        <SelectField
          control={form.control}
          name="industryId"
          label="Industry"
          items={industryOptions}
          placeholder="Select industry"
          disabled={disabled}
        />
      )}
      <PhoneField control={form.control} name="phone" disabled={disabled} />
      <TextField
        control={form.control}
        name="logoUrl"
        label="Logo URL"
        type="url"
        placeholder="https://example.com/logo.png"
        disabled={disabled}
      />
      {showStatus ? (
        <SelectField
          control={form.control}
          name="status"
          label="Status"
          items={businessStatusOptions}
          disabled={disabled}
        />
      ) : null}
    </section>
  );
}
