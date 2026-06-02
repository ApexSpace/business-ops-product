"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ContactFinancialRecordRow } from "@/components/contacts/contact-workspace/contact-financial-record-row";
import { EstimateFormDialog } from "@/components/estimates/estimate-form-dialog";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { FinancialRowActionsMenu } from "@/components/payments/workspace/financial-row-actions-menu";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { invalidateContactFinancial } from "@/lib/contact-financial";
import {
  ESTIMATE_MANUAL_STATUS_OPTIONS,
  formatEstimateDate,
  formatMoney,
} from "@/lib/estimate-profile";
import { getEstimateQuoteName } from "@/lib/financial-table-display";
import { RecordListEmpty } from "@/components/contacts/contact-workspace/contact-record-section";
import type { Estimate, EstimateStatus } from "@/types/api";

interface ContactEstimatesPanelProps {
  contactId: string;
  contactLabel: string;
  estimates: Estimate[];
  isLoading: boolean;
}

export function ContactEstimatesPanel({
  contactId,
  contactLabel,
  estimates,
  isLoading,
}: ContactEstimatesPanelProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [invoiceFromEstimate, setInvoiceFromEstimate] =
    useState<Estimate | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const refresh = () => void invalidateContactFinancial(queryClient);

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`estimates/${id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Estimate deleted");
      refresh();
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<Estimate>(`estimates/${id}/duplicate`, { method: "POST" }),
    onSuccess: (created) => {
      toast.success(`Duplicated as ${created.estimateNumber}`);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EstimateStatus }) =>
      apiClient<Estimate>(`estimates/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: () => {
      toast.success("Status updated");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEstimate = (estimate: Estimate) => {
    setEditing(estimate);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <RecordListEmpty message="Loading estimates…" />;
  }

  if (estimates.length === 0) {
    return (
      <>
        <EmptyState
          compact
          title="No estimates for this contact yet."
          action={
            <ActionButton onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              Create Estimate
            </ActionButton>
          }
          className="py-8"
        />
        <EstimateFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
          estimate={editing}
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
          Create Estimate
        </ActionButton>
      </div>
      <ul className="space-y-2">
        {estimates.map((estimate) => (
          <li key={estimate.id}>
            <ContactFinancialRecordRow
              title={getEstimateQuoteName(estimate)}
              lines={[
                estimate.estimateNumber,
                `${formatEstimateDate(estimate.issueDate)} · ${formatMoney(estimate.totalAmount)}`,
              ]}
              status={{ domain: "estimate", value: estimate.status }}
              onOpen={() => openEstimate(estimate)}
              actions={
                <FinancialRowActionsMenu
                  onView={() => openEstimate(estimate)}
                  onEdit={() => openEstimate(estimate)}
                  onDuplicate={() => duplicateMutation.mutate(estimate.id)}
                  onDelete={() => setDeleteId(estimate.id)}
                  statusOptions={ESTIMATE_MANUAL_STATUS_OPTIONS}
                  onStatusChange={(status) =>
                    statusMutation.mutate({ id: estimate.id, status })
                  }
                  extraItems={
                    <DropdownMenuItem
                      onClick={() => {
                        setInvoiceFromEstimate(estimate);
                        setInvoiceDialogOpen(true);
                      }}
                    >
                      Create Invoice
                    </DropdownMenuItem>
                  }
                />
              }
            />
          </li>
        ))}
      </ul>

      <EstimateFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        estimate={editing}
        defaultContactId={contactId}
        defaultContactLabel={contactLabel}
        lockContact
        onSuccess={refresh}
      />

      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onOpenChange={(open) => {
          setInvoiceDialogOpen(open);
          if (!open) setInvoiceFromEstimate(null);
        }}
        prefillFromEstimate={invoiceFromEstimate}
        lockContact
        defaultContactId={contactId}
        defaultContactLabel={contactLabel}
        onSuccess={refresh}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete estimate?"
        description="This estimate will be removed. This cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}
