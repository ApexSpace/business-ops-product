"use client";

import type { UseFormReturn } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
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
    <>
      <p className="text-sm text-muted-foreground">
        Defaults applied when creating new invoices. Business details and tax
        settings are managed in Business Profile.
      </p>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="invoice.prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice prefix</FormLabel>
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
            name="invoice.nextNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next invoice number</FormLabel>
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
            Preview: {invoicePreview}
          </p>
        </div>
        <FormField
          control={form.control}
          name="invoice.defaultPaymentTerms"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Default payment terms</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Net 30"
                  disabled={!canEdit}
                />
              </FormControl>
              <FormDescription>
                Used to pre-fill due dates (e.g. &quot;Net 30&quot; → 30 days).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invoice.defaultNotes"
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
          name="invoice.defaultTermsAndConditions"
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
            ["invoice.showLogo", "Show logo"],
            ["invoice.showBusinessAddress", "Show business address"],
            ["invoice.showPaymentInstructions", "Show payment instructions"],
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
