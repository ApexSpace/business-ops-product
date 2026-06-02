"use client";

import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import {
  applyInvoiceDefaults,
  type FinancialSettingsResponse,
} from "@/lib/financial-settings-profile";
import {
  calculateFormTotals,
  emptyLineItem,
  invoiceFormDefaults,
  invoiceFormSchema,
  invoiceFormToApiBody,
  invoiceFromEstimate,
  invoiceToForm,
  INVOICE_MANUAL_STATUS_OPTIONS,
  formatMoney,
  lineTotal,
  type InvoiceFormValues,
} from "@/lib/invoice-profile";
import { queryKeys } from "@/lib/query-keys";
import type {
  Estimate,
  Invoice,
  PaginatedResult,
  Service,
  WorkItem,
} from "@/types/api";

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  lockContact?: boolean;
  defaultEstimateId?: string;
  defaultWorkItemId?: string;
  prefillFromEstimate?: Estimate | null;
  onSuccess: () => void;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  defaultContactId,
  defaultContactLabel,
  lockContact,
  defaultEstimateId,
  defaultWorkItemId,
  prefillFromEstimate,
  onSuccess,
}: InvoiceFormDialogProps) {
  const isEdit = !!invoice;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoiceFormDefaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watched = useWatch({ control: form.control });
  const totals = useMemo(() => {
    const items = (watched.items ?? invoiceFormDefaults.items).map((item) => ({
      title: item.title ?? "",
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      serviceId: item.serviceId,
      description: item.description,
    }));
    return calculateFormTotals({
      items,
      taxAmount: Number(watched.taxAmount) || 0,
      discountAmount: Number(watched.discountAmount) || 0,
    });
  }, [watched.items, watched.taxAmount, watched.discountAmount]);

  const { data: financialSettings } = useQuery({
    queryKey: queryKeys.business.financialSettings(),
    queryFn: () =>
      apiClient<FinancialSettingsResponse>(
        "businesses/current/financial-settings",
      ),
    enabled: open && !isEdit,
  });

  const { data: services } = useQuery({
    queryKey: queryKeys.services.picker(),
    queryFn: () =>
      apiClient<PaginatedResult<Service>>("services", {
        searchParams: { page: 1, limit: 100, status: "ACTIVE" },
      }),
    enabled: open,
  });

  const contactId = watched.contactId;
  const { data: workItems } = useQuery({
    queryKey: queryKeys.workItems.list({
      contactId: contactId || undefined,
      page: 1,
      limit: 50,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<WorkItem>>("work-items", {
        searchParams: {
          page: 1,
          limit: 50,
          ...(contactId ? { contactId } : {}),
        },
      }),
    enabled: open && !!contactId,
  });

  const lockedContact = useMemo(() => {
    if (!defaultContactId || !defaultContactLabel) return undefined;
    return { id: defaultContactId, label: defaultContactLabel };
  }, [defaultContactId, defaultContactLabel]);

  const serviceItems = useMemo(() => {
    const items =
      services?.items.map((s) => ({
        value: s.id,
        label: s.category ? `${s.name} (${s.category})` : s.name,
      })) ?? [];
    return [{ value: "", label: "Custom line" }, ...items];
  }, [services?.items]);

  const { data: estimates } = useQuery({
    queryKey: queryKeys.estimates.list({
      contactId: contactId || undefined,
      page: 1,
      limit: 50,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<Estimate>>("estimates", {
        searchParams: {
          page: 1,
          limit: 50,
          ...(contactId ? { contactId } : {}),
        },
      }),
    enabled: open && !!contactId,
  });

  const estimateItems = useMemo(() => {
    const items =
      estimates?.items.map((e) => ({
        value: e.id,
        label: e.estimateNumber,
      })) ?? [];
    return [{ value: "", label: "None" }, ...items];
  }, [estimates?.items]);

  const workItemItems = useMemo(() => {
    const items =
      workItems?.items.map((w) => ({
        value: w.id,
        label: w.title,
      })) ?? [];
    return [{ value: "", label: "None" }, ...items];
  }, [workItems?.items]);

  useEffect(() => {
    if (!open) return;
    if (invoice) {
      form.reset(invoiceToForm(invoice));
    } else if (prefillFromEstimate) {
      form.reset(invoiceFromEstimate(prefillFromEstimate));
    } else {
      const base = {
        ...invoiceFormDefaults,
        contactId: defaultContactId ?? "",
        estimateId: defaultEstimateId ?? "",
        workItemId: defaultWorkItemId ?? "",
      };
      form.reset(
        financialSettings ? applyInvoiceDefaults(base, financialSettings) : base,
      );
    }
  }, [
    open,
    invoice,
    prefillFromEstimate,
    defaultContactId,
    defaultEstimateId,
    defaultWorkItemId,
    financialSettings,
    form,
  ]);

  const mutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      const body = invoiceFormToApiBody(values);
      if (isEdit && invoice) {
        return apiClient<Invoice>(`invoices/${invoice.id}`, {
          method: "PATCH",
          body,
        });
      }
      return apiClient<Invoice>("invoices", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Invoice updated" : "Invoice created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const applyServiceToLine = (index: number, serviceId: string) => {
    const service = services?.items.find((s) => s.id === serviceId);
    if (!service) return;
    form.setValue(`items.${index}.title`, service.name);
    if (service.price) {
      form.setValue(`items.${index}.unitPrice`, parseFloat(service.price));
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${invoice?.invoiceNumber}` : "New invoice"}
      description="Bill your customer — link an estimate or work item when helpful."
      form={form}
      schema={invoiceFormSchema}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
      size="2xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!isEdit && watched.invoiceNumberPreview ? (
          <FormItem>
            <FormLabel>Invoice number</FormLabel>
            <FormControl>
              <Input
                value={watched.invoiceNumberPreview}
                readOnly
                disabled
                className="bg-muted/40"
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Assigned when saved. Configure prefix in Financial Settings.
            </p>
          </FormItem>
        ) : null}

        <FormField
          control={form.control}
          name="contactId"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Customer</FormLabel>
              <FormControl>
                <ContactPicker
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Select customer…"
                  locked={!!lockContact}
                  lockedContact={lockedContact}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estimateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimate (optional)</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={estimateItems}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Link estimate"
                  disabled={!contactId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work item (optional)</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={workItemItems}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Link work item"
                  disabled={!contactId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={INVOICE_MANUAL_STATUS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="issueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due date (optional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FormLabel>Line items</FormLabel>
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
                <th className="w-24 px-2 py-2 text-right font-medium">
                  Total
                </th>
                <th className="w-10 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const item = watched.items?.[index];
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

      <FormField
        control={form.control}
        name="paymentTerms"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment terms (optional)</FormLabel>
            <FormControl>
              <Input placeholder="Net 30" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes (optional)</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Scope, thank-you message, or internal notes…"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="termsAndConditions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Terms &amp; conditions (optional)</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder="Payment, cancellation, and liability terms…"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  );
}
