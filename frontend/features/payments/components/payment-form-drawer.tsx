"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormSheet } from "@/components/forms/form-sheet";
import { StatusBadge } from "@/components/data-display/status-badge";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  canRecordInvoicePayment,
  formatMoney,
  invoiceOutstandingAmount,
} from "@/features/invoices/schemas/invoice-profile";
import {
  PAYMENT_METHOD_OPTIONS,
  invoicePickerLabel,
  paymentFormDefaults,
  paymentFormSchema,
  paymentFormToApiBody,
  paymentToForm,
  toDatetimeLocalValue,
  type PaymentFormValues,
} from "@/features/payments/schemas/payment-profile";
import { InvoiceCollectPaymentPanel } from "@/features/payments/payments-kit/invoice-collect-payment-panel";
import {
  FINANCIAL_DRAWER_CONTENT_CLASS,
  FINANCIAL_DRAWER_DESCRIPTION_CLASS,
  FINANCIAL_DRAWER_FOOTER_CLASS,
  FINANCIAL_DRAWER_HEADER_CLASS,
  FINANCIAL_DRAWER_SHEET_CLASS,
  FINANCIAL_DRAWER_TITLE_CLASS,
} from "@/features/payments/components/financial-form-drawer-shell";
import { queryKeys } from "@/lib/query/keys";
import type { Payment } from "@/features/payments/types";
import { listInvoices } from "@/features/invoices/api/invoices.api";
import { createPayment, updatePayment } from "@/features/payments/api/payments.api";

export interface PaymentFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment | null;
  defaultInvoiceId?: string;
  lockInvoice?: boolean;
  onSuccess: () => void;
}

export function PaymentFormDrawer({
  open,
  onOpenChange,
  payment,
  defaultInvoiceId,
  lockInvoice,
  onSuccess,
}: PaymentFormDrawerProps) {
  const isEdit = !!payment;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: paymentFormDefaults,
  });

  const invoiceId = form.watch("invoiceId");

  const { data: invoicesData } = useQuery({
    queryKey: queryKeys.invoices.list({ limit: 100 }),
    queryFn: () => listInvoices({ page: 1, limit: 100 }),
    enabled: open,
  });

  const payableInvoices = useMemo(() => {
    const items = invoicesData?.items ?? [];
    return items.filter(
      (inv) => canRecordInvoicePayment(inv) || inv.id === invoiceId,
    );
  }, [invoicesData?.items, invoiceId]);

  const invoiceItems = useMemo(
    () =>
      payableInvoices.map((inv) => ({
        value: inv.id,
        label: invoicePickerLabel(
          inv.invoiceNumber,
          inv.balanceDue,
          inv.contact?.label,
        ),
      })),
    [payableInvoices],
  );

  const selectedInvoice = useMemo(
    () => payableInvoices.find((inv) => inv.id === invoiceId),
    [payableInvoices, invoiceId],
  );

  useEffect(() => {
    if (!open) return;
    if (payment) {
      form.reset(paymentToForm(payment));
      return;
    }
    const preset = payableInvoices.find((i) => i.id === defaultInvoiceId);
    form.reset({
      ...paymentFormDefaults,
      invoiceId: defaultInvoiceId ?? "",
      amount: preset ? invoiceOutstandingAmount(preset) : 0,
      paidAt: toDatetimeLocalValue(new Date().toISOString()),
    });
    // Only reset when the drawer opens — not when the invoice list loads or the user picks an invoice.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payableInvoices intentionally omitted
  }, [open, payment, defaultInvoiceId, form]);

  useEffect(() => {
    if (!open || isEdit || !selectedInvoice) return;
    const balance = invoiceOutstandingAmount(selectedInvoice);
    if (balance > 0) {
      form.setValue("amount", balance);
    }
  }, [open, isEdit, selectedInvoice, form]);

  const mutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      const body = paymentFormToApiBody(values);
      if (isEdit && payment) {
        return updatePayment(payment.id, body);
      }
      return createPayment(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Payment updated" : "Payment recorded");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const methodItems = PAYMENT_METHOD_OPTIONS.filter(
    (o) => o.value !== "STRIPE" && o.value !== "WALLET",
  ).map((o) => ({
    value: o.value,
    label: o.label,
  }));

  const useCollectFlow = !isEdit && selectedInvoice;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit payment" : "Record payment"}
      description={
        useCollectFlow
          ? "Collect payment with cash, wallet, or embedded card (Stripe Connect)."
          : "Track money received against an invoice — simple operational payment logging."
      }
      className={FINANCIAL_DRAWER_SHEET_CLASS}
      headerClassName={FINANCIAL_DRAWER_HEADER_CLASS}
      titleClassName={FINANCIAL_DRAWER_TITLE_CLASS}
      descriptionClassName={FINANCIAL_DRAWER_DESCRIPTION_CLASS}
      contentClassName={FINANCIAL_DRAWER_CONTENT_CLASS}
      footerClassName={FINANCIAL_DRAWER_FOOTER_CLASS}
      form={form}
      schema={paymentFormSchema}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
      hideFooter={!!useCollectFlow}
    >
      <FormField
        control={form.control}
        name="invoiceId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Invoice</FormLabel>
            <FormControl>
              {lockInvoice && selectedInvoice ? (
                <Input
                  readOnly
                  value={invoicePickerLabel(
                    selectedInvoice.invoiceNumber,
                    selectedInvoice.balanceDue,
                    selectedInvoice.contact?.label,
                  )}
                />
              ) : (
                <SearchableSelect
                  inDialog
                  items={invoiceItems}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select invoice…"
                />
              )}
            </FormControl>
            {selectedInvoice ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Total {formatMoney(selectedInvoice.totalAmount)} · Balance{" "}
                  {formatMoney(selectedInvoice.balanceDue)}
                </span>
                <StatusBadge
                  status={selectedInvoice.status}
                  domain="invoice"
                />
              </div>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      {useCollectFlow ? (
        <InvoiceCollectPaymentPanel
          invoiceId={selectedInvoice.id}
          contactId={selectedInvoice.contactId}
          balanceDue={invoiceOutstandingAmount(selectedInvoice)}
          onComplete={() => {
            onSuccess();
            onOpenChange(false);
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0.01}
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
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment method</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      inDialog
                      items={methodItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Method"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="paidAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid date & time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Check #, transaction ID, receipt…"
                    {...field}
                  />
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
                  <Textarea rows={3} placeholder="Internal note…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </FormSheet>
  );
}
