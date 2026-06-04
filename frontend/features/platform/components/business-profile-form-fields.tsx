"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { BusinessProfileAddressFields } from "@/features/platform/components/business-profile-address-fields";
import { BusinessProfileBusinessFields } from "@/features/platform/components/business-profile-business-fields";
import { BusinessProfileContactFields } from "@/features/platform/components/business-profile-contact-fields";
import { BusinessProfileRegionalFields } from "@/features/platform/components/business-profile-regional-fields";
import {
  buildDisplayName,
  type BusinessProfileFormValues,
} from "@/features/settings/schemas/business-profile";
import type { BusinessProfileTab } from "@/features/settings/schemas/business-profile-tabs";
import { currencySymbolForCode } from "@/features/payments/utils/currencies";
import { listActiveIndustries } from "@/features/platform/api/platform.api";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

export interface BusinessProfileFormFieldsProps {
  form: UseFormReturn<BusinessProfileFormValues>;
  disabled?: boolean;
  showStatus?: boolean;
  activeTab?: BusinessProfileTab;
  constrainScroll?: boolean;
}

export function BusinessProfileFormFields({
  form,
  disabled = false,
  showStatus = false,
  activeTab,
  constrainScroll = true,
}: BusinessProfileFormFieldsProps) {
  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");
  const displayName = form.watch("displayName");
  const currencyCode = form.watch("taxesAndCurrency.currencyCode");
  const currencySymbol = currencyCode
    ? currencySymbolForCode(currencyCode)
    : "";

  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: queryKeys.industries.active(),
    queryFn: () => listActiveIndustries(),
  });

  const industryOptions =
    industries?.map((i) => ({ value: i.id, label: i.name })) ?? [];

  useEffect(() => {
    const computed = buildDisplayName(firstName, lastName);
    if (computed && computed !== displayName) {
      form.setValue("displayName", computed, { shouldDirty: true });
    }
  }, [firstName, lastName, displayName, form]);

  useEffect(() => {
    if (
      industries?.length &&
      !form.getValues("industryId") &&
      !disabled
    ) {
      form.setValue("industryId", industries[0]!.id);
    }
  }, [industries, form, disabled]);

  const show = (tab: BusinessProfileTab) => !activeTab || activeTab === tab;
  const showSectionTitle = !activeTab;

  return (
    <div
      className={cn(
        "space-y-6",
        constrainScroll && !activeTab && "max-h-[min(70vh,640px)] overflow-y-auto pr-1",
      )}
    >
      {show("contact") ? (
        <BusinessProfileContactFields
          form={form}
          disabled={disabled}
          showSectionTitle={showSectionTitle}
        />
      ) : null}

      {show("business") ? (
        <BusinessProfileBusinessFields
          form={form}
          disabled={disabled}
          showSectionTitle={showSectionTitle}
          showStatus={showStatus}
          industriesLoading={industriesLoading}
          industryOptions={industryOptions}
        />
      ) : null}

      {show("address") ? (
        <BusinessProfileAddressFields
          form={form}
          disabled={disabled}
          showSectionTitle={showSectionTitle}
        />
      ) : null}

      {show("regional") ? (
        <BusinessProfileRegionalFields
          form={form}
          disabled={disabled}
          showSectionTitles={showSectionTitle}
          activeTab={!!activeTab}
          currencySymbol={currencySymbol}
        />
      ) : null}
    </div>
  );
}
