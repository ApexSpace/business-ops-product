"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { CustomFeeFormFields } from "@/features/custom-fees/components/custom-fee-form-fields";
import type { CustomFee } from "@/features/custom-fees/api/custom-fees.api";
import { useCustomFeeMutations } from "@/features/custom-fees/hooks/use-custom-fee-mutations";
import { useCustomFeesList } from "@/features/custom-fees/hooks/use-custom-fees-list";
import {
  customFeeFormDefaults,
  customFeeFormToApiBody,
  customFeeToForm,
  formatCustomFeeAmount,
  formatCustomFeeScope,
  type CustomFeeFormValues,
} from "@/features/custom-fees/schemas/custom-fee-profile";
import { PAYMENT_METHOD_OPTIONS } from "@/features/payments/schemas/payment-profile";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

const METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((option) => [option.value, option.label]),
);

export function CustomFeesSettings() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useCustomFeesList({
    page: 1,
    limit: 100,
  });
  const { createMutation, updateMutation, deleteMutation } =
    useCustomFeeMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomFee | null>(null);
  const [editingFee, setEditingFee] = useState<CustomFee | null>(null);
  const [formValues, setFormValues] =
    useState<CustomFeeFormValues>(customFeeFormDefaults);

  const listSummary = useMemo(
    () =>
      (data?.items ?? []).map((fee) => ({
        id: fee.id,
        fee,
        amountLabel: formatCustomFeeAmount(fee),
        scopeLabel: formatCustomFeeScope(fee, METHOD_LABELS),
      })),
    [data?.items],
  );

  const openCreateDialog = () => {
    setEditingFee(null);
    setFormValues(customFeeFormDefaults);
    setDialogOpen(true);
  };

  const openEditDialog = (fee: CustomFee) => {
    setEditingFee(fee);
    setFormValues(customFeeToForm(fee));
    setDialogOpen(true);
  };

  const submitForm = () => {
    const parsed = customFeeFormToApiBody(formValues);
    if (editingFee) {
      updateMutation.mutate(
        { id: editingFee.id, body: parsed },
        { onSuccess: () => setDialogOpen(false) },
      );
      return;
    }
    createMutation.mutate(parsed, { onSuccess: () => setDialogOpen(false) });
  };

  if (isLoading) {
    return <LoadingState label="Loading custom fees…" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load custom fees"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Custom Fees"
      description="Custom fees are extra charges that get applied at checkout, such as convenience fees or eco fees."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-medium">Configured fees</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fees apply automatically in staff POS checkout when enabled.
            </p>
          </div>
          {canEdit ? (
            <Button type="button" variant="brand" onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              New custom fee
            </Button>
          ) : null}
        </div>

        {listSummary.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
            No custom fees yet. Create one to start applying checkout surcharges.
          </div>
        ) : (
          <div className="space-y-3">
            {listSummary.map(({ id, fee, amountLabel, scopeLabel }) => (
              <div
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{fee.name}</p>
                    <Badge variant={fee.isEnabled ? "default" : "secondary"}>
                      {fee.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {amountLabel} · {scopeLabel}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(fee)}
                    >
                      <Pencil className="mr-1 size-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(fee)}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFee ? "Edit custom fee" : "New custom fee"}
            </DialogTitle>
          </DialogHeader>
          <CustomFeeFormFields
            values={formValues}
            disabled={!canEdit}
            showEnabledToggle={Boolean(editingFee)}
            onChange={setFormValues}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={
                !canEdit ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              onClick={submitForm}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete custom fee?"
        description={
          deleteTarget
            ? `Remove "${deleteTarget.name}" from checkout fee rules.`
            : undefined
        }
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
        isDeleting={deleteMutation.isPending}
      />
    </SettingsFormPage>
  );
}
