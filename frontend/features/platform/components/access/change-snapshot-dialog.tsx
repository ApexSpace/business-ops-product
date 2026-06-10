"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { previewPlatformBusinessAccessAction } from "@/features/platform/api/business-access.api";
import { ActionImpactPreviewDialog } from "@/features/platform/components/access/action-impact-preview-dialog";
import { listPlatformSnapshots } from "@/features/platform/api/snapshots.api";
import type { PreviewActionResult } from "@/features/platform/types/business-subscription";
import {
  executeSubscriptionAction,
  type SubscriptionActionPayload,
} from "@/features/platform/utils/subscription-action-executor";
import { queryKeys } from "@/lib/query/keys";
import type { SelectOption } from "@/components/forms/select-field";

function withCurrentOption(
  items: SelectOption[],
  currentId?: string | null,
  currentName?: string | null,
): SelectOption[] {
  if (!currentId || !currentName || items.some((item) => item.value === currentId)) {
    return items;
  }
  return [{ value: currentId, label: `${currentName} (current)` }, ...items];
}

export function ChangeSnapshotDialog({
  businessId,
  currentSnapshotId,
  currentSnapshotName,
  open,
  onOpenChange,
  onSuccess,
}: {
  businessId: string;
  currentSnapshotId?: string | null;
  currentSnapshotName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [snapshotId, setSnapshotId] = useState<string | null>(
    currentSnapshotId ?? null,
  );
  const [applyMode, setApplyMode] = useState<"apply" | "reference">("apply");
  const [preview, setPreview] = useState<PreviewActionResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resetForm = () => {
    setStep(1);
    setSnapshotId(currentSnapshotId ?? null);
    setApplyMode("apply");
    setPreview(null);
    setPreviewOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: queryKeys.platform.snapshots.list({ status: "PUBLISHED", limit: 50 }),
    queryFn: () =>
      listPlatformSnapshots({ page: 1, limit: 50, status: "PUBLISHED" }),
    enabled: open,
  });

  const buildInput = () => ({
    snapshotId: snapshotId!,
    applySnapshot: applyMode === "apply",
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      previewPlatformBusinessAccessAction(businessId, {
        actionKey: "CHANGE_SNAPSHOT",
        input: buildInput(),
      }),
    onSuccess: (result) => {
      setPreview(result);
      setPreviewOpen(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const executeMutation = useMutation({
    mutationFn: () => {
      const payload: SubscriptionActionPayload = {
        changeSnapshot: buildInput(),
      };
      return executeSubscriptionAction(businessId, "CHANGE_SNAPSHOT", payload);
    },
    onSuccess: () => {
      toast.success(
        applyMode === "apply"
          ? "Snapshot updated and applied"
          : "Snapshot reference updated",
      );
      setPreviewOpen(false);
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const snapshotItems = useMemo(
    () =>
      withCurrentOption(
        snapshots?.items.map((s) => ({ value: s.id, label: s.name })) ?? [],
        currentSnapshotId,
        currentSnapshotName,
      ),
    [snapshots?.items, currentSnapshotId, currentSnapshotName],
  );

  const selectedSnapshotName =
    snapshots?.items.find((s) => s.id === snapshotId)?.name ??
    currentSnapshotName ??
    "—";

  return (
    <>
      <Dialog open={open && !previewOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Snapshot</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {step === 1 && (
              <div className="space-y-2">
                <Label>Published snapshot</Label>
                <SearchableSelect
                  inDialog
                  items={snapshotItems}
                  value={snapshotId}
                  onValueChange={setSnapshotId}
                  placeholder="Select snapshot"
                  disabled={snapshotsLoading}
                  emptyMessage={
                    snapshotsLoading
                      ? "Loading snapshots…"
                      : "No published snapshots"
                  }
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <RadioGroup
                  value={applyMode}
                  onValueChange={(v) => setApplyMode(v as "apply" | "reference")}
                >
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="apply" id="apply-mode" />
                    <Label htmlFor="apply-mode" className="font-normal">
                      Update and apply snapshot (default)
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="reference" id="reference-mode" />
                    <Label htmlFor="reference-mode" className="font-normal">
                      Update reference only
                    </Label>
                  </div>
                </RadioGroup>
                {applyMode === "apply" && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    Applying a snapshot may change labels, navigation, CRM defaults,
                    and other provisioned settings.
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <p className="text-sm text-muted-foreground">
                Confirm snapshot change to{" "}
                <strong>{selectedSnapshotName}</strong>
                {applyMode === "apply" ? " with apply." : " (reference only)."}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                disabled={step === 1 && !snapshotId}
                onClick={() => setStep(step + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending || !snapshotId}
              >
                Preview & confirm
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionImpactPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        actionLabel="Change Snapshot"
        isExecuting={executeMutation.isPending}
        onConfirm={() => executeMutation.mutate()}
      />
    </>
  );
}
