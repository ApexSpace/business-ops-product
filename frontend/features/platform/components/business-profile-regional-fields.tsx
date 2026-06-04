"use client";

import { useId } from "react";
import type { UseFormReturn } from "react-hook-form";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BusinessProfileSectionTitle } from "@/features/platform/components/business-profile-section-title";
import type { BusinessProfileFormValues } from "@/features/settings/schemas/business-profile";
import { currencySelectOptions } from "@/features/payments/utils/currencies";
import { timezoneOptions } from "@/lib/config/geo-options";

export function BusinessProfileRegionalFields({
  form,
  disabled,
  showSectionTitles,
  activeTab,
  currencySymbol,
}: {
  form: UseFormReturn<BusinessProfileFormValues>;
  disabled: boolean;
  showSectionTitles: boolean;
  activeTab?: boolean;
  currencySymbol: string;
}) {
  const currencySymbolFieldId = useId();

  return (
    <>
      <section className="space-y-4">
        {showSectionTitles ? (
          <BusinessProfileSectionTitle>Online &amp; timezone</BusinessProfileSectionTitle>
        ) : activeTab ? (
          <p className="text-sm text-muted-foreground">
            Website, timezone, and default tax settings for estimates and
            invoices.
          </p>
        ) : null}
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
        {showSectionTitles ? (
          <BusinessProfileSectionTitle>Taxes &amp; currency</BusinessProfileSectionTitle>
        ) : null}
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
                <FormLabel className="font-normal">Prices include tax</FormLabel>
                <FormDescription>
                  When enabled, line prices are treated as tax-inclusive.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </section>
    </>
  );
}
