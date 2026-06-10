"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { ActionImpactPreviewDialog } from "@/features/platform/components/access/action-impact-preview-dialog";
import { ReactivateBusinessDialog } from "@/features/platform/components/access/reactivate-business-dialog";
import { useSubscriptionActionFlow } from "@/features/platform/components/access/use-subscription-action-flow";
import { previewPlatformBusinessAccessAction } from "@/features/platform/api/business-access.api";
import type { SubscriptionActionKey } from "@/features/platform/types/business-subscription";
import {
  ACTIONS_REQUIRING_ACCESS_TAB,
  buildActionLabelContextFromBusiness,
  deriveListRowActions,
  getActionConfirmationCopy,
  getSubscriptionActionLabel,
} from "@/features/platform/utils/business-subscription-actions";
import type { Business } from "@/features/platform/types";
import { MoreVertical } from "lucide-react";

const DANGER_ACTIONS = new Set<SubscriptionActionKey>([
  "CANCEL_SUBSCRIPTION",
  "EXPIRE_TRIAL",
  "SUSPEND_BUSINESS",
]);

export function BusinessListSubscriptionActions({
  business,
  onSuccess,
}: {
  business: Business;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const actionFlow = useSubscriptionActionFlow({
    businessId: business.id,
    onSuccess,
  });

  const { recommendedAction, moreActions } = deriveListRowActions(business);
  const labelContext = buildActionLabelContextFromBusiness(business);

  const previewMutation = useMutation({
    mutationFn: (actionKey: SubscriptionActionKey) =>
      previewPlatformBusinessAccessAction(business.id, { actionKey }),
    onSuccess: (result, actionKey) => {
      actionFlow.openPreview(result, {
        key: actionKey,
        label: getSubscriptionActionLabel(actionKey, labelContext),
        category: DANGER_ACTIONS.has(actionKey) ? "danger" : "billing",
        visible: true,
        enabled: true,
        severity: DANGER_ACTIONS.has(actionKey) ? "danger" : "safe",
        requiresConfirmation: result.requiresConfirmation,
        requiresInput: false,
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openAccessTab = () => {
    router.push(`/platform/businesses/${business.id}?tab=access`);
    toast.message("Complete this action on the Access tab.");
  };

  const handleActionKey = (actionKey: SubscriptionActionKey) => {
    if (ACTIONS_REQUIRING_ACCESS_TAB.includes(actionKey)) {
      openAccessTab();
      return;
    }
    if (actionKey === "REACTIVATE_BUSINESS") {
      setReactivateOpen(true);
      return;
    }
    previewMutation.mutate(actionKey);
  };

  if (!recommendedAction && moreActions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {recommendedAction && (
          <Button
            size="sm"
            variant="outline"
            disabled={previewMutation.isPending || actionFlow.isExecuting}
            onClick={() => handleActionKey(recommendedAction)}
          >
            {getSubscriptionActionLabel(recommendedAction, labelContext)}
          </Button>
        )}
        {moreActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <IconButton aria-label="More actions" className="size-8">
                  <MoreVertical className="size-4" />
                </IconButton>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              {moreActions.map((actionKey) => (
                <DropdownMenuItem
                  key={actionKey}
                  variant={DANGER_ACTIONS.has(actionKey) ? "destructive" : "default"}
                  onClick={() => handleActionKey(actionKey)}
                >
                  {getSubscriptionActionLabel(actionKey, labelContext)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ActionImpactPreviewDialog
        open={actionFlow.previewOpen}
        onOpenChange={actionFlow.setPreviewOpen}
        preview={actionFlow.preview}
        actionLabel={
          actionFlow.pendingAction?.key
            ? getSubscriptionActionLabel(
                actionFlow.pendingAction.key,
                labelContext,
              )
            : "Action"
        }
        confirmationDescription={
          actionFlow.pendingAction?.key
            ? getActionConfirmationCopy(
                actionFlow.pendingAction.key,
                labelContext,
              ).description
            : undefined
        }
        confirmLabel={
          actionFlow.pendingAction?.key
            ? getActionConfirmationCopy(
                actionFlow.pendingAction.key,
                labelContext,
              ).confirmLabel
            : undefined
        }
        isExecuting={actionFlow.isExecuting}
        onConfirm={actionFlow.confirmAction}
      />

      <ReactivateBusinessDialog
        businessId={business.id}
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}
