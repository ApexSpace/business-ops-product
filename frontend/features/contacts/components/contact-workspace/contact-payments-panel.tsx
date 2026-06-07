"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContactFinancialRecordRow } from "@/features/contacts/components/contact-workspace/contact-financial-record-row";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { EmptyState } from "@/components/data-display/empty-state";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { TransactionTableRowActions } from "@/features/payments/components/workspace/transaction-table-row-actions";
import { refundPayment } from "@/features/payments/api/payments.api";
import { invalidateContactFinancial } from "@/features/contacts/utils/contact-financial";
import { formatMoney } from "@/features/invoices/schemas/invoice-profile";
import {
  canRefundPayment,
  formatTransactionDate,
  formatTransactionProvider,
  getTransactionStatusLabel,
} from "@/features/payments/schemas/payment-profile";
import { viewTransactionInvoicePublic } from "@/features/payments/utils/transaction-invoice-view";
import type { Payment } from "@/features/contacts/types";

interface ContactPaymentsPanelProps {
  payments: Payment[];
  isLoading: boolean;
}

export function ContactPaymentsPanel({
  payments,
  isLoading,
}: ContactPaymentsPanelProps) {
  const queryClient = useQueryClient();
  const [refundId, setRefundId] = useState<string | null>(null);

  const refresh = () => void invalidateContactFinancial(queryClient);

  const refundMutation = useMutation({
    mutationFn: refundPayment,
    onSuccess: () => {
      toast.success("Transaction refunded");
      refresh();
      setRefundId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <RecordListEmpty message="Loading payments…" />;
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        compact
        title="No payments received for this contact yet."
        description="Record a payment from an invoice."
        className="py-8"
      />
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {payments.map((payment) => (
          <li key={payment.id}>
            <ContactFinancialRecordRow
              title={payment.invoice?.invoiceNumber ?? "Payment"}
              lines={[
                `${formatMoney(payment.amount)} · ${formatTransactionProvider(payment)}`,
                `${formatTransactionDate(payment.paidAt)}${payment.reference ? ` · ${payment.reference}` : ""}`,
              ]}
              status={{
                domain: "transaction",
                value: canRefundPayment(payment) ? "SUCCEEDED" : "REFUNDED",
                label: getTransactionStatusLabel(payment),
              }}
              onOpen={() => void viewTransactionInvoicePublic(payment)}
              actions={
                <TransactionTableRowActions
                  onView={() => void viewTransactionInvoicePublic(payment)}
                  onRefund={
                    canRefundPayment(payment)
                      ? () => setRefundId(payment.id)
                      : undefined
                  }
                />
              }
            />
          </li>
        ))}
      </ul>

      <ConfirmDeleteDialog
        open={!!refundId}
        onOpenChange={(open) => !open && setRefundId(null)}
        title="Refund transaction?"
        description="This reverses the payment and updates the linked invoice balance. Stripe payments are refunded through your connected account."
        confirmLabel="Refund"
        isPending={refundMutation.isPending}
        onConfirm={() => refundId && refundMutation.mutate(refundId)}
      />
    </>
  );
}
