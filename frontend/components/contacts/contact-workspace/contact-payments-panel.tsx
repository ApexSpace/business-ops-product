"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContactFinancialRecordRow } from "@/components/contacts/contact-workspace/contact-financial-record-row";
import { RecordListEmpty } from "@/components/contacts/contact-workspace/contact-record-section";
import { EmptyState } from "@/components/data-display/empty-state";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { TransactionRowActionsMenu } from "@/components/payments/workspace/transaction-row-actions-menu";
import { apiClient } from "@/lib/api-client";
import { invalidateContactFinancial } from "@/lib/contact-financial";
import { formatMoney } from "@/lib/invoice-profile";
import {
  formatTransactionDate,
  formatTransactionProvider,
  getTransactionStatusLabel,
} from "@/lib/payment-profile";
import type { Payment } from "@/types/api";

interface ContactPaymentsPanelProps {
  payments: Payment[];
  isLoading: boolean;
}

export function ContactPaymentsPanel({
  payments,
  isLoading,
}: ContactPaymentsPanelProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = () => void invalidateContactFinancial(queryClient);

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`payments/${id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Payment deleted");
      refresh();
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openPayment = (payment: Payment) => {
    setEditing(payment);
    setDialogOpen(true);
  };

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
                `${formatMoney(payment.amount)} · ${formatTransactionProvider(payment.method)}`,
                `${formatTransactionDate(payment.paidAt)}${payment.reference ? ` · ${payment.reference}` : ""}`,
              ]}
              status={{
                domain: "transaction",
                value: "SUCCEEDED",
                label: getTransactionStatusLabel(payment),
              }}
              onOpen={() => openPayment(payment)}
              actions={
                <TransactionRowActionsMenu
                  onView={() => openPayment(payment)}
                  onEdit={() => openPayment(payment)}
                  onDelete={() => setDeleteId(payment.id)}
                />
              }
            />
          </li>
        ))}
      </ul>

      <PaymentFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        payment={editing}
        onSuccess={refresh}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete payment?"
        description="This removes the payment record and recalculates the invoice balance."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}
