"use client";

import type { UseFormReturn } from "react-hook-form";
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
  showSnapshotPicker,
  snapshotsLoading,
  snapshotOptions,
  twoColumnLayout = false,
}: {
  form: UseFormReturn<BusinessProfileFormValues>;
  disabled: boolean;
  showSectionTitle: boolean;
  showStatus: boolean;
  industriesLoading: boolean;
  industryOptions: { value: string; label: string }[];
  showSnapshotPicker?: boolean;
  snapshotsLoading?: boolean;
  snapshotOptions?: { value: string; label: string }[];
  twoColumnLayout?: boolean;
}) {
  const industryField = industriesLoading ? (
    <Skeleton className="h-10 w-full" />
  ) : industryOptions.length === 0 ? (
    <p className="text-sm text-muted-foreground sm:col-span-2">
      No industries configured. Ask a platform admin to add industries under
      Platform → Industries.
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
  );

  const statusField = showStatus ? (
    <SelectField
      control={form.control}
      name="status"
      label="Status"
      items={businessStatusOptions}
      disabled={disabled}
    />
  ) : null;

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
      {twoColumnLayout && showStatus ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {industryField}
          {statusField}
        </div>
      ) : (
        <>
          {industryField}
          {statusField}
        </>
      )}
      {showSnapshotPicker ? (
        snapshotsLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <SelectField
            control={form.control}
            name="snapshotId"
            label="Snapshot (optional)"
            items={[
              { value: "", label: "Default business snapshot" },
              ...(snapshotOptions ?? []),
            ]}
            placeholder="Default business snapshot"
            disabled={disabled}
          />
        )
      ) : null}
      <TextField
        control={form.control}
        name="logoUrl"
        label="Logo URL"
        type="url"
        placeholder="https://example.com/logo.png"
        disabled={disabled}
      />
    </section>
  );
}
