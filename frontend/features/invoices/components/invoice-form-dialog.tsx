"use client";

import { FormDialog } from "@/components/forms/form-dialog";
import { invoiceFormSchema } from "@/features/invoices/schemas/invoice-profile";
import {
  InvoiceBasicFields,
  InvoiceFormFooterFields,
} from "@/features/invoices/components/form/invoice-basic-fields";
import { InvoiceFormSummary } from "@/features/invoices/components/form/invoice-form-summary";
import { InvoiceLineItems } from "@/features/invoices/components/form/invoice-line-items";
import { useInvoiceForm } from "@/features/invoices/hooks/use-invoice-form";
import type { Estimate, Invoice } from "@/features/invoices/types";

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

export function InvoiceFormDialog(props: InvoiceFormDialogProps) {
  const {
    open,
    onOpenChange,
    lockContact,
    onSuccess,
    invoice,
    defaultContactId,
    defaultContactLabel,
    defaultEstimateId,
    defaultWorkItemId,
    prefillFromEstimate,
  } = props;

  const {
    isEdit,
    form,
    fields,
    append,
    remove,
    watched,
    totals,
    mutation,
    pendingAction,
    canSend,
    saveDraft,
    sendInvoice,
    contactId,
    lockedContact,
    serviceItems,
    estimateItems,
    workItemItems,
    applyServiceToLine,
    invoice: editingInvoice,
    currencyCode,
  } = useInvoiceForm({
    open,
    invoice,
    defaultContactId,
    defaultContactLabel,
    defaultEstimateId,
    defaultWorkItemId,
    prefillFromEstimate,
    onSuccess,
    onOpenChange,
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${editingInvoice?.invoiceNumber}` : "New invoice"}
      description={
        canSend
          ? "Select a customer, add line items, then save as draft or send."
          : "Select a customer, add line items, and save."
      }
      form={form}
      schema={invoiceFormSchema}
      onSubmit={canSend ? sendInvoice : saveDraft}
      onSecondarySubmit={canSend ? saveDraft : undefined}
      showSecondarySubmit={canSend}
      pendingAction={pendingAction}
      submitLabel={canSend ? "Send" : "Save"}
      secondarySubmitLabel="Save as draft"
      isPending={mutation.isPending}
      size="2xl"
    >
      <InvoiceBasicFields
        form={form}
        dialogOpen={open}
        isEdit={isEdit}
        invoiceNumberPreview={watched.invoiceNumberPreview}
        invoiceNumber={editingInvoice?.invoiceNumber}
        invoiceStatus={editingInvoice?.status}
        invoiceBalanceDue={editingInvoice?.balanceDue}
        lockContact={lockContact}
        lockedContact={lockedContact}
        estimateItems={estimateItems}
        workItemItems={workItemItems}
        contactId={contactId}
      />

      <InvoiceLineItems
        form={form}
        fields={fields}
        append={append}
        remove={remove}
        watchedItems={watched.items}
        serviceItems={serviceItems}
        applyServiceToLine={applyServiceToLine}
        currencyCode={currencyCode}
      />

      <InvoiceFormSummary
        form={form}
        dialogOpen={open}
        totals={totals}
        currencyCode={currencyCode}
      />

      <InvoiceFormFooterFields form={form} dialogOpen={open} />
    </FormDialog>
  );
}
