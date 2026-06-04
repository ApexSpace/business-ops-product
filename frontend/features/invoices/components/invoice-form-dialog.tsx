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
    contactId,
    lockedContact,
    serviceItems,
    estimateItems,
    workItemItems,
    applyServiceToLine,
    invoice: editingInvoice,
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
      description="Bill your customer — link an estimate or work item when helpful."
      form={form}
      schema={invoiceFormSchema}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
      size="2xl"
    >
      <InvoiceBasicFields
        form={form}
        isEdit={isEdit}
        invoiceNumberPreview={watched.invoiceNumberPreview}
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
      />

      <InvoiceFormSummary form={form} totals={totals} />

      <InvoiceFormFooterFields form={form} />
    </FormDialog>
  );
}
