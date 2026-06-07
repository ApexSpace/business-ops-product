"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ContactFinancialRecordRow } from "@/features/contacts/components/contact-workspace/contact-financial-record-row";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { EmptyState } from "@/components/data-display/empty-state";
import { InvoiceFormDialog } from "@/features/invoices/components/invoice-form-dialog";
import { PaymentFormDialog } from "@/features/payments/components/payment-form-dialog";
import { InvoiceTableRowActions } from "@/features/payments/components/workspace/invoice-table-row-actions";
import { ActionButton } from "@/components/ui/action-button";
import {
  duplicateInvoice,
  updateInvoiceStatus,
} from "@/features/invoices/api/invoices.api";
import { openInvoicePublicView } from "@/features/invoices/utils/invoice-payment-link";
import { invalidateContactFinancial } from "@/features/contacts/utils/contact-financial";
import { getInvoiceDisplayName } from "@/features/payments/utils/financial-table-display";
import {
  canRecordInvoicePayment,
  formatInvoiceDate,
  formatMoney,
} from "@/features/invoices/schemas/invoice-profile";
import type { Invoice, InvoiceStatus } from "@/features/invoices/types";

interface ContactInvoicesPanelProps {
  contactId: string;
  contactLabel: string;
  invoices: Invoice[];
  isLoading: boolean;
}

export function ContactInvoicesPanel({
  contactId,
  contactLabel,
  invoices,
  isLoading,
}: ContactInvoicesPanelProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const refresh = () => void invalidateContactFinancial(queryClient);

  const duplicateMutation = useMutation({
    mutationFn: duplicateInvoice,
    onSuccess: (created) => {
      toast.success(`Duplicated as ${created.invoiceNumber}`);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openInvoiceEditor = (invoice: Invoice) => {
    setEditing(invoice);
    setDialogOpen(true);
  };

  const viewInvoicePublic = (invoice: Invoice) => {
    if (!openInvoicePublicView(invoice)) {
      toast.error("Public link is not available for this invoice");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const canRecordPayment = (row: Invoice) => canRecordInvoicePayment(row);

  const canCopyLink = (row: Invoice) => row.status !== "VOID";

  const canVoid = (row: Invoice) => row.status !== "VOID";

  if (isLoading) {
    return <RecordListEmpty message="Loading invoices…" />;
  }

  if (invoices.length === 0) {
    return (
      <>
        <EmptyState
          compact
          title="No invoices for this contact yet."
          action={
            <ActionButton onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              Create Invoice
            </ActionButton>
          }
          className="py-8"
        />
        <InvoiceFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
          invoice={editing}
          defaultContactId={contactId}
          defaultContactLabel={contactLabel}
          lockContact
          onSuccess={refresh}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-2 flex justify-end">
        <ActionButton variant="outline" onClick={openCreate}>
          <Plus className="mr-1 size-3.5" />
          Create Invoice
        </ActionButton>
      </div>
      <ul className="space-y-2">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <ContactFinancialRecordRow
              title={getInvoiceDisplayName(invoice)}
              lines={[
                invoice.invoiceNumber,
                `${formatInvoiceDate(invoice.issueDate)} · ${formatMoney(invoice.totalAmount)} · Balance ${formatMoney(invoice.balanceDue)}`,
              ]}
              status={{ domain: "invoice", value: invoice.status }}
              onOpen={() => viewInvoicePublic(invoice)}
              actions={
                <InvoiceTableRowActions
                  invoice={invoice}
                  canCopyLink={canCopyLink(invoice)}
                  onView={() => viewInvoicePublic(invoice)}
                  onEdit={
                    invoice.status !== "PAID"
                      ? () => openInvoiceEditor(invoice)
                      : undefined
                  }
                  onDuplicate={() => duplicateMutation.mutate(invoice.id)}
                  onVoid={
                    canVoid(invoice)
                      ? () =>
                          statusMutation.mutate({
                            id: invoice.id,
                            status: "VOID",
                          })
                      : undefined
                  }
                  onRecordPayment={
                    canRecordPayment(invoice)
                      ? () => {
                          setPaymentInvoiceId(invoice.id);
                          setPaymentDialogOpen(true);
                        }
                      : undefined
                  }
                />
              }
            />
          </li>
        ))}
      </ul>

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        invoice={editing}
        defaultContactId={contactId}
        defaultContactLabel={contactLabel}
        lockContact
        onSuccess={refresh}
      />

      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) setPaymentInvoiceId(null);
        }}
        defaultInvoiceId={paymentInvoiceId ?? undefined}
        lockInvoice={!!paymentInvoiceId}
        onSuccess={refresh}
      />

    </>
  );
}
