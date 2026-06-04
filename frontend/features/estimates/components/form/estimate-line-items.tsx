"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  emptyLineItem,
  formatMoney,
  lineTotal,
  type EstimateFormValues,
} from "@/features/estimates/schemas/estimate-profile";

interface EstimateLineItemsProps {
  form: UseFormReturn<EstimateFormValues>;
  fields: FieldArrayWithId<EstimateFormValues, "items", "id">[];
  append: (value: EstimateFormValues["items"][number]) => void;
  remove: (index: number) => void;
  watchedItems:
    | EstimateFormValues["items"]
    | undefined
    | Array<Partial<EstimateFormValues["items"][number]>>;
  serviceItems: { value: string; label: string }[];
  applyServiceToLine: (index: number, serviceId: string) => void;
}

export function EstimateLineItems({
  form,
  fields,
  append,
  remove,
  watchedItems,
  serviceItems,
  applyServiceToLine,
}: EstimateLineItemsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Line items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(emptyLineItem())}
        >
          <Plus className="mr-1 size-3.5" />
          Add line
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-2 py-2 font-medium">Service</th>
              <th className="px-2 py-2 font-medium">Title</th>
              <th className="w-20 px-2 py-2 font-medium">Qty</th>
              <th className="w-28 px-2 py-2 font-medium">Unit price</th>
              <th className="w-24 px-2 py-2 text-right font-medium">Total</th>
              <th className="w-10 px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const item = watchedItems?.[index];
              const rowTotal = item
                ? lineTotal(
                    Number(item.quantity) || 0,
                    Number(item.unitPrice) || 0,
                  )
                : 0;
              return (
                <tr key={field.id} className="border-b border-border/50">
                  <td className="px-2 py-1.5 align-top">
                    <FormField
                      control={form.control}
                      name={`items.${index}.serviceId`}
                      render={({ field: f }) => (
                        <SearchableSelect
                          items={serviceItems}
                          value={f.value ?? ""}
                          onValueChange={(v) => {
                            f.onChange(v ?? "");
                            if (v) applyServiceToLine(index, v);
                          }}
                          placeholder="Service"
                          triggerClassName="h-8 w-full min-w-[120px] text-xs"
                        />
                      )}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <FormField
                      control={form.control}
                      name={`items.${index}.title`}
                      render={({ field: f }) => (
                        <Input className="h-8 text-xs" {...f} />
                      )}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: f }) => (
                        <Input
                          type="number"
                          min={0.0001}
                          step="any"
                          className="h-8 text-xs"
                          {...f}
                          onChange={(e) =>
                            f.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      )}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field: f }) => (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8 text-xs"
                          {...f}
                          onChange={(e) =>
                            f.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      )}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right align-top text-xs font-medium tabular-nums">
                    {formatMoney(rowTotal)}
                  </td>
                  <td className="px-1 py-1.5 align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {form.formState.errors.items?.message ? (
        <p className="text-sm text-destructive">
          {String(form.formState.errors.items.message)}
        </p>
      ) : null}
    </div>
  );
}
