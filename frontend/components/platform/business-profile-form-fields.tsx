"use client";

import { useEffect, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { PhoneField } from "@/components/forms/phone-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildDisplayName,
  type BusinessProfileFormValues,
} from "@/lib/business-profile";
import type { BusinessProfileTab } from "@/lib/business-profile-tabs";
import { currencySelectOptions, currencySymbolForCode } from "@/lib/currencies";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  businessStatusOptions,
  countryOptions,
  timezoneOptions,
} from "@/lib/select-options";
import { cn } from "@/lib/utils";
import type { IndustryOption } from "@/types/api";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b pb-2 text-sm font-medium text-foreground">
      {children}
    </h3>
  );
}

export interface BusinessProfileFormFieldsProps {
  form: UseFormReturn<BusinessProfileFormValues>;
  disabled?: boolean;
  showStatus?: boolean;
  /** When set, only render this category (tab panel). Omit to show all sections stacked. */
  activeTab?: BusinessProfileTab;
  /** When false, form grows with page scroll (settings pages). Default true for dialogs. */
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
  const currencySymbolFieldId = useId();

  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: queryKeys.industries.active(),
    queryFn: () => apiClient<IndustryOption[]>("industries/active"),
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

  return (
    <div
      className={cn(
        "space-y-6",
        constrainScroll && !activeTab && "max-h-[min(70vh,640px)] overflow-y-auto pr-1",
      )}
    >
      {show("contact") ? (
        <section className="space-y-4">
          {!activeTab ? <SectionTitle>Primary contact</SectionTitle> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="firstName"
              label="First name"
              placeholder="Jane"
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="lastName"
              label="Last name"
              placeholder="Smith"
              disabled={disabled}
            />
          </div>
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input {...field} readOnly disabled className="bg-muted" />
                </FormControl>
                <FormDescription>
                  Auto-filled from first and last name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="jane@example.com"
            disabled={disabled}
          />
        </section>
      ) : null}

      {show("business") ? (
        <section className="space-y-4">
          {!activeTab ? <SectionTitle>Business</SectionTitle> : null}
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
          <PhoneField
            control={form.control}
            name="phone"
            disabled={disabled}
          />
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
      ) : null}

      {show("address") ? (
        <section className="space-y-4">
          {!activeTab ? <SectionTitle>Address</SectionTitle> : null}
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        </section>
      ) : null}

      {show("regional") ? (
        <>
          <section className="space-y-4">
            {!activeTab ? (
              <SectionTitle>Online &amp; timezone</SectionTitle>
            ) : (
              <p className="text-sm text-muted-foreground">
                Website, timezone, and default tax settings for estimates and
                invoices.
              </p>
            )}
            <TextField
              control={form.control}
              name="website"
              label="Website"
              type="url"
              placeholder="https://example.com"
              disabled={disabled}
            />
            <SelectField
              control={form.control}
              name="timezone"
              label="Timezone"
              items={timezoneOptions}
              disabled={disabled}
            />
          </section>

          <section className="space-y-4">
            {!activeTab ? <SectionTitle>Taxes &amp; currency</SectionTitle> : null}
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name="taxesAndCurrency.currencyCode"
                label="Currency"
                items={currencySelectOptions}
                placeholder="Select currency"
                searchable={false}
                disabled={disabled}
              />
              <div className="grid gap-1.5">
                <Label htmlFor={currencySymbolFieldId}>Currency symbol</Label>
                <Input
                  id={currencySymbolFieldId}
                  value={currencySymbol}
                  readOnly
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Set automatically from the selected currency.
                </p>
              </div>
              <FormField
                control={form.control}
                name="taxesAndCurrency.defaultTaxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default tax rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        disabled={disabled}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="taxesAndCurrency.pricesIncludeTax"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="font-normal">
                      Prices include tax
                    </FormLabel>
                    <FormDescription>
                      When enabled, line prices are treated as tax-inclusive.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
