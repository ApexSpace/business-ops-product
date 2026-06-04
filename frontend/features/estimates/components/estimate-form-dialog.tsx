"use client";

import { FormDialog } from "@/components/forms/form-dialog";
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
  } = useEstimateForm({
    open,
    estimate,
    defaultContactId,
    defaultContactLabel,
    onSuccess,
    onOpenChange,
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${editingEstimate?.estimateNumber}` : "New estimate"}
      description="Build a quote for your customer before invoicing."
      form={form}
      schema={estimateFormSchema}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
      size="2xl"
    >
      <EstimateBasicFields
        form={form}
        isEdit={isEdit}
        estimateNumberPreview={watched.estimateNumberPreview}
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
      />

      <EstimateFormSummary form={form} totals={totals} />

      <EstimateFormFooterFields form={form} />
    </FormDialog>
  );
}
