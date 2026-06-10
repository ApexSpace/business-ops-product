"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { previewPlatformBusinessAccessAction } from "@/features/platform/api/business-access.api";
import { ActionImpactPreviewDialog } from "@/features/platform/components/access/action-impact-preview-dialog";
import type { PreviewActionResult } from "@/features/platform/types/business-subscription";
import type { ReactivateBusinessMode } from "@/features/platform/types/business-subscription";
import {
  executeSubscriptionAction,
  type SubscriptionActionPayload,
} from "@/features/platform/utils/subscription-action-executor";
import type { SubscriptionAccessStatus } from "@/features/platform/types/business-access";
import {
  getActionConfirmationCopy,
  getSubscriptionActionLabel,
} from "@/features/platform/utils/business-subscription-actions";

const MODE_OPTIONS: { value: ReactivateBusinessMode; label: string; description: string }[] = [
  {
    value: "business_only",
    label: "Business only",
    description: "Reactivate workspace access without restoring subscription.",
  },
  {
    value: "restore_paid",
    label: "Restore paid subscription",
    description: "Restore active paid subscription state.",
  },
  {
    value: "restore_trial",
    label: "Restore trial",
    description: "Restore trialing subscription with a new trial end date.",
  },
  {
    value: "restore_internal",
    label: "Restore internal",
    description: "Restore internal/free subscription.",
  },
];

export function ReactivateBusinessDialog({
  businessId,
  open,
  onOpenChange,
  recommendedMode,
  subscriptionStatus,
  onSuccess,
}: {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendedMode?: ReactivateBusinessMode;
  subscriptionStatus?: SubscriptionAccessStatus | null;
  onSuccess: () => void;
}) {
  const restoreLabel = getSubscriptionActionLabel("REACTIVATE_BUSINESS", {
    subscriptionStatus,
  });
  const [mode, setMode] = useState<ReactivateBusinessMode>(
    recommendedMode ?? "business_only",
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<PreviewActionResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resetForm = () => {
    setMode(recommendedMode ?? "business_only");
    setCurrentPeriodEnd("");
    setReason("");
    setNotes("");
    setPreview(null);
    setPreviewOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const previewMutation = useMutation({
    mutationFn: () =>
      previewPlatformBusinessAccessAction(businessId, {
        actionKey: "REACTIVATE_BUSINESS",
        input: {
          mode,
          currentPeriodEnd: currentPeriodEnd || undefined,
          reason: reason || undefined,
          notes: notes || undefined,
        },
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
        reactivate: {
          mode,
          currentPeriodEnd: currentPeriodEnd || undefined,
          reason: reason || undefined,
          notes: notes || undefined,
        },
      };
      return executeSubscriptionAction(businessId, "REACTIVATE_BUSINESS", payload);
    },
    onSuccess: () => {
      toast.success("Business reactivated");
      setPreviewOpen(false);
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Dialog open={open && !previewOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{restoreLabel}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label>Reactivation mode</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as ReactivateBusinessMode)}
              >
                {MODE_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-start gap-2">
                    <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} />
                    <div>
                      <Label htmlFor={`mode-${opt.value}`} className="font-normal">
                        {opt.label}
                        {recommendedMode === opt.value ? " (recommended)" : ""}
                      </Label>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
            {mode === "restore_trial" && (
              <div className="space-y-2">
                <Label>Period end</Label>
                <Input
                  type="date"
                  value={currentPeriodEnd}
                  onChange={(e) => setCurrentPeriodEnd(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending}
            >
              Preview & continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionImpactPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        actionLabel={restoreLabel}
        confirmationDescription={
          getActionConfirmationCopy("REACTIVATE_BUSINESS", { subscriptionStatus })
            .description
        }
        confirmLabel={restoreLabel}
        isExecuting={executeMutation.isPending}
        onConfirm={() => executeMutation.mutate()}
      />
    </>
  );
}
