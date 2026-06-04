"use client";

import type { UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    <>
      <p className="text-sm text-muted-foreground">
        Defaults applied when creating new estimates. Business details and tax
        settings are managed in Business Profile.
      </p>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="estimate.prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimate prefix</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={10}
                  className="uppercase"
                  disabled={!canEdit}
                  onChange={(e) =>
                    field.onChange(e.target.value.toUpperCase())
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-1.5">
          <FormField
            control={form.control}
            name="estimate.nextNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next estimate number</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 1)
                    }
                    disabled={!canEdit}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-sm text-muted-foreground">
            Preview: {estimatePreview}
          </p>
        </div>
        <FormField
          control={form.control}
          name="estimate.defaultExpiryDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default expiry days</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value, 10) || 1)
                  }
                  disabled={!canEdit}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estimate.defaultNotes"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Default notes</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} disabled={!canEdit} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estimate.defaultTermsAndConditions"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Default terms &amp; conditions</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} disabled={!canEdit} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="space-y-3 rounded-lg border border-border/70 p-4">
        <p className="text-sm font-medium">Document display</p>
        {(
          [
            ["estimate.showLogo", "Show logo"],
            ["estimate.showBusinessAddress", "Show business address"],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!canEdit}
                  />
                </FormControl>
                <FormLabel className="font-normal">{label}</FormLabel>
              </FormItem>
            )}
          />
        ))}
      </div>
    </>
  );
}
