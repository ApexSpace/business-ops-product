"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { PreviewActionResult } from "@/features/platform/types/business-subscription";

function StateSummary({
  label,
  state,
  canAccess,
  reason,
}: {
  label: string;
  state: PreviewActionResult["beforeState"];
  canAccess: boolean;
  reason: string;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <Badge variant={canAccess ? "default" : "destructive"}>
          {canAccess ? "Can access" : "Cannot access"}
        </Badge>
      </div>
      <p className="text-sm">{reason}</p>
      <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <dt>Business</dt>
          <dd className="text-foreground">{state.businessStatus}</dd>
        </div>
        <div>
          <dt>Subscription</dt>
          <dd className="text-foreground">{state.subscriptionStatus ?? "—"}</dd>
        </div>
        <div>
          <dt>Plan tier</dt>
          <dd className="text-foreground">{state.planTierName ?? "—"}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd className="text-foreground">{state.paymentStatus ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ActionImpactPreviewDialog({
  open,
  onOpenChange,
  preview,
  actionLabel,
  isExecuting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PreviewActionResult | null;
  actionLabel: string;
  isExecuting?: boolean;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  if (!preview) return null;

  const needsCheckbox = preview.requiresConfirmation;
  const canConfirm = !needsCheckbox || confirmed;

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirmed(false);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm: {actionLabel}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {!preview.allowed && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {preview.reason ?? "This action is not allowed in the current state."}
            </p>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Access impact</span>
            <ArrowRight className="size-4" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <StateSummary
              label="Before"
              state={preview.beforeState}
              canAccess={preview.accessImpact.beforeCanAccess}
              reason={preview.accessImpact.beforeReason}
            />
            <StateSummary
              label="After"
              state={preview.afterState}
              canAccess={preview.accessImpact.afterCanAccess}
              reason={preview.accessImpact.afterReason}
            />
          </div>

          {preview.paymentImpact?.createsPaymentRecord && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p className="font-medium">Payment record</p>
              <p>
                {preview.paymentImpact.amount != null
                  ? `${preview.paymentImpact.amount} ${preview.paymentImpact.currency ?? ""}`
                  : "A payment record will be created"}
                {preview.paymentImpact.paymentType
                  ? ` (${preview.paymentImpact.paymentType})`
                  : null}
              </p>
            </div>
          )}

          {preview.capabilityDiff &&
            (preview.capabilityDiff.added.length > 0 ||
              preview.capabilityDiff.removed.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-green-700">Capabilities added</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {preview.capabilityDiff.added.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      preview.capabilityDiff.added.map((cap) => (
                        <Badge key={cap.key} className="bg-green-100 text-green-800">
                          {cap.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-700">Capabilities removed</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {preview.capabilityDiff.removed.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      preview.capabilityDiff.removed.map((cap) => (
                        <Badge key={cap.key} variant="destructive">
                          {cap.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          {preview.snapshotImpact && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
              <p className="font-medium">Snapshot change</p>
              {preview.snapshotImpact.applySnapshot &&
                preview.snapshotImpact.mayOverwriteConfiguration && (
                  <p className="mt-1">
                    Applying this snapshot may overwrite labels, navigation, and provisioned
                    settings.
                  </p>
                )}
            </div>
          )}

          {preview.warnings.length > 0 && (
            <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
              {preview.warnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}

          {needsCheckbox && preview.allowed && (
            <div className="flex items-start gap-2 rounded-md border p-3">
              <Checkbox
                id="confirm-danger"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
              />
              <Label htmlFor="confirm-danger" className="font-normal leading-snug">
                I understand the impact of this action and want to proceed.
              </Label>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={needsCheckbox ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={!preview.allowed || !canConfirm || isExecuting}
          >
            {isExecuting ? "Applying…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
