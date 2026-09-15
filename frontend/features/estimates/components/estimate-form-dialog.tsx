"use client";

import { FormSheet } from "@/components/forms/form-sheet";
import {
  FORM_DRAWER_CONTENT_COMPACT_CLASS,
  FORM_DRAWER_DESCRIPTION_CLASS,
  FORM_DRAWER_FOOTER_CLASS,
  FORM_DRAWER_HEADER_COMPACT_CLASS,
  FORM_DRAWER_SHEET_FINANCIAL_CLASS,
  FORM_DRAWER_TITLE_COMPACT_CLASS,
} from "@/components/forms/form-drawer-shell";
import { estimateFormSchema } from "@/features/estimates/schemas/estimate-profile";
import {
  EstimateBasicFields,
  EstimateFormFooterFields,
} from "@/features/estimates/components/form/estimate-basic-fields";
import { EstimateFormSummary } from "@/features/estimates/components/form/estimate-form-summary";
import { EstimateLineItems } from "@/features/estimates/components/form/estimate-line-items";
import { useEstimateForm } from "@/features/estimates/hooks/use-estimate-form";
import type { Estimate } from "@/features/estimates/types";

interface EstimateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimate?: Estimate | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  lockContact?: boolean;
  onSuccess: () => void;
}

export function EstimateFormDialog({
  open,
  onOpenChange,
  estimate,
  defaultContactId,
  defaultContactLabel,
  lockContact,
  onSuccess,
}: EstimateFormDialogProps) {
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
    workItemItems,
    applyServiceToLine,
    estimate: editingEstimate,
    currencyCode,
  } = useEstimateForm({
    open,
    estimate,
    defaultContactId,
    defaultContactLabel,
    onSuccess,
    onOpenChange,
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${editingEstimate?.estimateNumber}` : "New estimate"}
      description="Create a quote to send to your customer for approval."
      className={FORM_DRAWER_SHEET_FINANCIAL_CLASS}
      width="wide"
      headerClassName={FORM_DRAWER_HEADER_COMPACT_CLASS}
      titleClassName={FORM_DRAWER_TITLE_COMPACT_CLASS}
      descriptionClassName={FORM_DRAWER_DESCRIPTION_CLASS}
      contentClassName={FORM_DRAWER_CONTENT_COMPACT_CLASS}
      footerClassName={FORM_DRAWER_FOOTER_CLASS}
      form={form}
      schema={estimateFormSchema}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
    >
      <EstimateBasicFields
        form={form}
        dialogOpen={open}
        isEdit={isEdit}
        estimateNumberPreview={watched.estimateNumberPreview}
        estimateStatus={editingEstimate?.status}
        lockContact={lockContact}
        lockedContact={lockedContact}
        workItemItems={workItemItems}
        contactId={contactId}
      />

      <EstimateLineItems
        form={form}
        fields={fields}
        append={append}
        remove={remove}
        watchedItems={watched.items}
        serviceItems={serviceItems}
        applyServiceToLine={applyServiceToLine}
        currencyCode={currencyCode}
      />

      <EstimateFormSummary
        form={form}
        dialogOpen={open}
        totals={totals}
        currencyCode={currencyCode}
      />

      <EstimateFormFooterFields form={form} dialogOpen={open} />
    </FormSheet>
  );
}
