"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ContactFinancialRecordRow } from "@/features/contacts/components/contact-workspace/contact-financial-record-row";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { EmptyState } from "@/components/data-display/empty-state";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { InvoiceFormDialog } from "@/features/invoices/components/invoice-form-dialog";
import { PaymentFormDialog } from "@/features/payments/components/payment-form-dialog";
import { FinancialRowActionsMenu } from "@/features/payments/components/workspace/financial-row-actions-menu";
import { ActionButton } from "@/components/ui/action-button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  deleteInvoice,
  duplicateInvoice,
  updateInvoiceStatus,
} from "@/features/invoices/api/invoices.api";
import { invalidateContactFinancial } from "@/features/contacts/utils/contact-financial";
import { getInvoiceDisplayName } from "@/features/payments/utils/financial-table-display";
import {
  formatInvoiceDate,
  formatMoney,
  INVOICE_MANUAL_STATUS_OPTIONS,
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const refresh = () => void invalidateContactFinancial(queryClient);

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      toast.success("Invoice deleted");
      refresh();
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

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

  const openInvoice = (invoice: Invoice) => {
    setEditing(invoice);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const canRecordPayment = (row: Invoice) =>
    row.status !== "VOID" && parseFloat(row.balanceDue) > 0;

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
              onOpen={() => openInvoice(invoice)}
              actions={
                <FinancialRowActionsMenu
                  onView={() => openInvoice(invoice)}
                  onEdit={() => openInvoice(invoice)}
                  onDuplicate={() => duplicateMutation.mutate(invoice.id)}
                  onDelete={() => setDeleteId(invoice.id)}
                  statusOptions={INVOICE_MANUAL_STATUS_OPTIONS}
                  onStatusChange={(status) =>
                    statusMutation.mutate({ id: invoice.id, status })
                  }
                  extraItems={
                    canRecordPayment(invoice) ? (
                      <DropdownMenuItem
                        onClick={() => {
                          setPaymentInvoiceId(invoice.id);
                          setPaymentDialogOpen(true);
                        }}
                      >
                        Record Payment
                      </DropdownMenuItem>
                    ) : null
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

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete invoice?"
        description="This invoice will be removed. This cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}
