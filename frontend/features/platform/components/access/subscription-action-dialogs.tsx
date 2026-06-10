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
import { ActionImpactPreviewDialog } from "@/features/platform/components/access/action-impact-preview-dialog";
import { ChangePackageDialog } from "@/features/platform/components/access/change-package-dialog";
import { ChangeSnapshotDialog } from "@/features/platform/components/access/change-snapshot-dialog";
import { MarkPaidDialog } from "@/features/platform/components/access/mark-paid-dialog";
import { ReactivateBusinessDialog } from "@/features/platform/components/access/reactivate-business-dialog";
import { useSubscriptionActionFlow } from "@/features/platform/components/access/use-subscription-action-flow";
import { previewPlatformBusinessAccessAction } from "@/features/platform/api/business-access.api";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import type { SubscriptionActionDefinition } from "@/features/platform/types/business-subscription";
import {
  buildActionLabelContext,
  getActionConfirmationCopy,
  getSubscriptionActionLabel,
  withFriendlyActionLabel,
} from "@/features/platform/utils/business-subscription-actions";

export function useSubscriptionActionDialogs({
  businessId,
  access,
  onSuccess,
  onRecordPayment,
}: {
  businessId: string;
  access?: BusinessAccess | null;
  onSuccess: () => void;
  onRecordPayment: () => void;
}) {
  const [changePackageOpen, setChangePackageOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [changeSnapshotOpen, setChangeSnapshotOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [extendTrialOpen, setExtendTrialOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("14");
  const [extendTrialEnd, setExtendTrialEnd] = useState("");

  const labelContext = access ? buildActionLabelContext(access) : {};

  const actionFlow = useSubscriptionActionFlow({
    businessId,
    onSuccess,
  });

  const extendPreviewMutation = useMutation({
    mutationFn: () =>
      previewPlatformBusinessAccessAction(businessId, {
        actionKey: "EXTEND_TRIAL",
        input: {
          days: extendTrialEnd ? undefined : Number(extendDays) || 14,
          currentPeriodEnd: extendTrialEnd || undefined,
        },
      }),
    onSuccess: (result) => {
      actionFlow.openPreview(
        result,
        withFriendlyActionLabel(
          {
            key: "EXTEND_TRIAL",
            label: "Extend Trial",
            category: "trial",
            visible: true,
            enabled: true,
            severity: "safe",
            requiresConfirmation: result.requiresConfirmation,
            requiresInput: true,
          },
          labelContext,
        ),
        {
          extendTrial: {
            days: extendTrialEnd ? undefined : Number(extendDays) || 14,
            currentPeriodEnd: extendTrialEnd || undefined,
          },
        },
      );
      setExtendTrialOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAction = (action: SubscriptionActionDefinition) => {
    if (!access || !action.enabled) return;

    const friendlyAction = withFriendlyActionLabel(action, labelContext);

    switch (action.key) {
      case "CHANGE_PACKAGE":
        setChangePackageOpen(true);
        return;
      case "CHANGE_SNAPSHOT":
        setChangeSnapshotOpen(true);
        return;
      case "MARK_PAID":
        setMarkPaidOpen(true);
        return;
      case "RECORD_PAYMENT":
        onRecordPayment();
        return;
      case "REACTIVATE_BUSINESS":
        setReactivateOpen(true);
        return;
      case "EXTEND_TRIAL":
        setExtendTrialOpen(true);
        return;
      case "MANUAL_ADJUSTMENT":
        toast.message("Open the Access tab to use advanced adjustments.");
        return;
      default:
        actionFlow.startPreview(friendlyAction);
    }
  };

  const pendingConfirmation =
    actionFlow.pendingAction?.key != null
      ? getActionConfirmationCopy(actionFlow.pendingAction.key, labelContext)
      : null;

  const dialogs = access ? (
    <>
      <ActionImpactPreviewDialog
        open={actionFlow.previewOpen}
        onOpenChange={actionFlow.setPreviewOpen}
        preview={actionFlow.preview}
        actionLabel={
          actionFlow.pendingAction
            ? getSubscriptionActionLabel(
                actionFlow.pendingAction.key,
                labelContext,
              )
            : "Action"
        }
        confirmationDescription={pendingConfirmation?.description}
        confirmLabel={pendingConfirmation?.confirmLabel}
        isExecuting={actionFlow.isExecuting}
        onConfirm={actionFlow.confirmAction}
      />

      <ChangePackageDialog
        businessId={businessId}
        access={access}
        open={changePackageOpen}
        onOpenChange={setChangePackageOpen}
        onSuccess={onSuccess}
      />

      <MarkPaidDialog
        businessId={businessId}
        access={access}
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        onSuccess={onSuccess}
      />

      <ChangeSnapshotDialog
        businessId={businessId}
        currentSnapshotId={access.snapshotId}
        currentSnapshotName={access.snapshotName}
        open={changeSnapshotOpen}
        onOpenChange={setChangeSnapshotOpen}
        onSuccess={onSuccess}
      />

      <ReactivateBusinessDialog
        businessId={businessId}
        subscriptionStatus={access.subscription?.status}
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        onSuccess={onSuccess}
      />

      <Dialog open={extendTrialOpen} onOpenChange={setExtendTrialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend trial</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Extend by days</p>
              <Input
                type="number"
                min={1}
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or set period end date</p>
              <Input
                type="date"
                value={extendTrialEnd}
                onChange={(e) => setExtendTrialEnd(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              onClick={() => extendPreviewMutation.mutate()}
              disabled={extendPreviewMutation.isPending}
            >
              Preview & continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  ) : null;

  return {
    handleAction,
    dialogs,
    isLoading: actionFlow.isPreviewing || actionFlow.isExecuting,
  };
}
