"use client";

import type { UseFormReturn } from "react-hook-form";
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
  totals: { subtotal: number; tax: number; discount: number; total: number };
}

export function InvoiceFormSummary({ form, totals }: InvoiceFormSummaryProps) {
  return (
    <>
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

      <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">
            {formatMoney(totals.subtotal)}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-4">
          <span className="text-muted-foreground">Tax</span>
          <span className="tabular-nums">{formatMoney(totals.tax)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-4">
          <span className="text-muted-foreground">Discount</span>
          <span className="tabular-nums">−{formatMoney(totals.discount)}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4 border-t border-border/60 pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(totals.total)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Balance due on save follows status (full amount for draft/sent unless
          marked paid).
        </p>
      </div>
    </>
  );
}
