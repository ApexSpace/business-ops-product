"use client";

import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { InvoiceFormOptionalSection } from "@/features/invoices/components/form/invoice-form-optional-section";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatMoney, type InvoiceFormValues } from "@/features/invoices/schemas/invoice-profile";

interface InvoiceFormSummaryProps {
  form: UseFormReturn<InvoiceFormValues>;
  dialogOpen?: boolean;
  totals: { subtotal: number; tax: number; discount: number; total: number };
  currencyCode?: string;
}

export function InvoiceFormSummary({
  form,
  dialogOpen = true,
  totals,
  currencyCode = "USD",
}: InvoiceFormSummaryProps) {
  const taxAmount = form.watch("taxAmount");
  const discountAmount = form.watch("discountAmount");

  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) {
      setAdjustmentsOpen(false);
      return;
    }
    setAdjustmentsOpen((taxAmount ?? 0) > 0 || (discountAmount ?? 0) > 0);
  }, [dialogOpen, taxAmount, discountAmount]);

  const showTaxLine = adjustmentsOpen || totals.tax > 0;
  const showDiscountLine = adjustmentsOpen || totals.discount > 0;

  return (
    <div className="space-y-3">
      <InvoiceFormOptionalSection
        label="Add tax or discount"
        open={adjustmentsOpen}
        onOpenChange={setAdjustmentsOpen}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="taxAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
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
          <FormField
            control={form.control}
            name="discountAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
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
      </InvoiceFormOptionalSection>

      <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">
            {formatMoney(totals.subtotal, currencyCode)}
          </span>
        </div>
        {showTaxLine ? (
          <div className="mt-1 flex justify-between gap-4">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{formatMoney(totals.tax, currencyCode)}</span>
          </div>
        ) : null}
        {showDiscountLine ? (
          <div className="mt-1 flex justify-between gap-4">
            <span className="text-muted-foreground">Discount</span>
            <span className="tabular-nums">−{formatMoney(totals.discount, currencyCode)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between gap-4 border-t border-border/60 pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(totals.total, currencyCode)}</span>
        </div>
      </div>
    </div>
  );
}
