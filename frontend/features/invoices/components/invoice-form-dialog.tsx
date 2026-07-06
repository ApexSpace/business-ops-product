"use client";

import { FormSheet } from "@/components/forms/form-sheet";
import {
  FINANCIAL_DRAWER_CONTENT_CLASS,
  FINANCIAL_DRAWER_DESCRIPTION_CLASS,
  FINANCIAL_DRAWER_FOOTER_CLASS,
  FINANCIAL_DRAWER_HEADER_CLASS,
  FINANCIAL_DRAWER_SHEET_CLASS,
  FINANCIAL_DRAWER_TITLE_CLASS,
} from "@/features/payments/components/financial-form-drawer-shell";
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
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${editingInvoice?.invoiceNumber}` : "New invoice"}
      description={
        canSend
          ? "Create an invoice and send it to your customer."
          : "Create an invoice for your customer."
      }
      className={FINANCIAL_DRAWER_SHEET_CLASS}
      headerClassName={FINANCIAL_DRAWER_HEADER_CLASS}
      titleClassName={FINANCIAL_DRAWER_TITLE_CLASS}
      descriptionClassName={FINANCIAL_DRAWER_DESCRIPTION_CLASS}
      contentClassName={FINANCIAL_DRAWER_CONTENT_CLASS}
      footerClassName={FINANCIAL_DRAWER_FOOTER_CLASS}
      form={form}
      schema={invoiceFormSchema}
      onSubmit={canSend ? sendInvoice : saveDraft}
      onSecondarySubmit={canSend ? saveDraft : undefined}
      showSecondarySubmit={canSend}
      pendingAction={pendingAction}
      submitLabel={canSend ? "Send" : "Save"}
      secondarySubmitLabel="Save as draft"
      isPending={mutation.isPending}
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
    </FormSheet>
  );
}
