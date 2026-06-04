"use client";

import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { LeadRelatedRecords } from "@/features/leads/components/lead-related-records";
import { LeadDetailSheetForm } from "@/features/leads/components/lead-detail-sheet-form";
import { useLeadDetailSheet } from "@/features/leads/hooks/use-lead-detail-sheet";
import {
  Form,
  FormSchemaProvider,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatLeadCreatedAt,
  formatLeadValue,
  getLeadAssigneeName,
  getLeadContactName,
  getLeadDisplayTitle,
  getLeadServiceLabel,
} from "@/features/leads/utils/leads";
import type { Lead, Pipeline } from "@/features/leads/types";

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  pipeline: Pipeline | null;
  onSuccess: () => void;
}

export function LeadDetailSheet({
  open,
  onOpenChange,
  lead,
  pipeline,
  onSuccess,
}: LeadDetailSheetProps) {
  const sheet = useLeadDetailSheet({
    open,
    lead,
    pipeline,
    onSuccess,
    onOpenChange,
  });

  if (!lead) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{getLeadDisplayTitle(lead)}</SheetTitle>
            <SheetDescription>
              {getLeadContactName(lead)} · {lead.pipeline.name} · Created{" "}
              {formatLeadCreatedAt(lead.createdAt)}
            </SheetDescription>
          </SheetHeader>

          <LeadRelatedRecords lead={lead} />

          <div className="space-y-1 px-4 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground">Service:</span>{" "}
              {getLeadServiceLabel(lead)}
            </p>
            <p>
              <span className="text-foreground">Value:</span>{" "}
              {formatLeadValue(lead.value)}
            </p>
            {getLeadAssigneeName(lead) ? (
              <p>
                <span className="text-foreground">Assigned:</span>{" "}
                {getLeadAssigneeName(lead)}
              </p>
            ) : null}
          </div>

          <Form {...sheet.form}>
            <FormSchemaProvider schema={sheet.schema}>
              <LeadDetailSheetForm
                form={sheet.form}
                canAssign={sheet.canAssign}
                stageItems={sheet.stageItems}
                serviceItems={sheet.serviceItems}
                assigneeItems={sheet.assigneeItems}
                isPending={sheet.saveMutation.isPending}
                onCancel={() => onOpenChange(false)}
                onDelete={() => sheet.setDeleteOpen(true)}
                onSubmit={(v) => sheet.saveMutation.mutate(v)}
              />
            </FormSchemaProvider>
          </Form>
        </SheetContent>
      </Sheet>

      <ConfirmDeleteDialog
        open={sheet.deleteOpen}
        onOpenChange={sheet.setDeleteOpen}
        title="Delete lead?"
        description="This lead will be removed from the pipeline. This cannot be undone."
        isPending={sheet.deleteMutation.isPending}
        onConfirm={() => sheet.deleteMutation.mutate()}
      />
    </>
  );
}
