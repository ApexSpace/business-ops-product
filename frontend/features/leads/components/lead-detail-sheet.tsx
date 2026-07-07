"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { LeadRelatedRecords } from "@/features/leads/components/lead-related-records";
import { LeadDetailSheetForm } from "@/features/leads/components/lead-detail-sheet-form";
import { useLeadDetailSheet } from "@/features/leads/hooks/use-lead-detail-sheet";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormSchemaProvider,
} from "@/components/ui/form";
import {
  formatLeadCreatedAt,
  formatLeadValue,
  getLeadAssigneeName,
  getLeadContactName,
  getLeadDisplayTitle,
  getLeadServiceLabel,
} from "@/features/leads/utils/leads";
import type { Lead, Pipeline } from "@/features/leads/types";

const LEAD_DETAIL_FORM_ID = "lead-detail-form";

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  pipeline: Pipeline | null;
  onSuccess: () => void;
  isLoading?: boolean;
}

export function LeadDetailSheet({
  open,
  onOpenChange,
  lead,
  pipeline,
  onSuccess,
  isLoading = false,
}: LeadDetailSheetProps) {
  const sheet = useLeadDetailSheet({
    open,
    lead,
    pipeline,
    onSuccess,
    onOpenChange,
  });

  return (
    <>
      <EntityDetailDrawer
        open={open}
        onOpenChange={onOpenChange}
        width="standard"
        title={lead ? getLeadDisplayTitle(lead) : "Lead"}
        subtitle={
          lead
            ? `${getLeadContactName(lead)} · ${lead.pipeline.name} · Created ${formatLeadCreatedAt(lead.createdAt)}`
            : undefined
        }
        isLoading={isLoading || (open && !lead)}
        badges={
          lead ? <StatusBadge status={lead.status} domain="lead" /> : null
        }
        overflowActions={
          lead
            ? [
                {
                  id: "delete",
                  label: "Delete",
                  icon: <Trash2 className="mr-2 size-4" />,
                  destructive: true,
                  onSelect: () => sheet.setDeleteOpen(true),
                },
              ]
            : undefined
        }
        footer={
          lead ? (
            <EntityDetailFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form={LEAD_DETAIL_FORM_ID}
                size="sm"
                disabled={sheet.saveMutation.isPending}
              >
                {sheet.saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </EntityDetailFooter>
          ) : null
        }
      >
        {lead ? (
          <>
            <LeadRelatedRecords lead={lead} />

            <div className="space-y-1 text-sm text-muted-foreground">
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
                  formId={LEAD_DETAIL_FORM_ID}
                  form={sheet.form}
                  canAssign={sheet.canAssign}
                  stageItems={sheet.stageItems}
                  serviceItems={sheet.serviceItems}
                  assigneeItems={sheet.assigneeItems}
                  onSubmit={(v) => sheet.saveMutation.mutate(v)}
                />
              </FormSchemaProvider>
            </Form>
          </>
        ) : null}
      </EntityDetailDrawer>

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
