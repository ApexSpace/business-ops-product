"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  BusinessAccessSummaryCard,
  CurrentPaymentSummaryCard,
} from "@/features/platform/components/access/business-access-summary-card";
import { AccessAdvancedSection } from "@/features/platform/components/access/access-advanced-section";
import { ActionImpactPreviewDialog } from "@/features/platform/components/access/action-impact-preview-dialog";
import { ChangePackageDialog } from "@/features/platform/components/access/change-package-dialog";
import { MarkPaidDialog } from "@/features/platform/components/access/mark-paid-dialog";
import { ChangeSnapshotDialog } from "@/features/platform/components/access/change-snapshot-dialog";
import { ReactivateBusinessDialog } from "@/features/platform/components/access/reactivate-business-dialog";
import {
  RecommendedActionCard,
  SubscriptionActionGroups,
} from "@/features/platform/components/access/subscription-action-groups";
import { useSubscriptionActionFlow } from "@/features/platform/components/access/use-subscription-action-flow";
import {
  getPlatformBusinessAccess,
  previewPlatformBusinessAccessAction,
} from "@/features/platform/api/business-access.api";
import type { Business } from "@/features/platform/types";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import type { SubscriptionActionDefinition } from "@/features/platform/types/business-subscription";
import { listPlatformPlanGroups } from "@/features/platform/api/plan-groups.api";
import { queryKeys } from "@/lib/query/keys";

export function PlatformBusinessAccessTab({
  business,
  canUpdate,
  onNavigateToPayments,
  onNavigateToSubscriptions,
}: {
  business: Business;
  canUpdate: boolean;
  onNavigateToPayments?: (options?: { recordPayment?: boolean }) => void;
  onNavigateToSubscriptions?: () => void;
}) {
  const { data: access, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.access(business.id),
    queryFn: () => getPlatformBusinessAccess(business.id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading access settings…</p>;
  }

  if (!access) {
    return <p className="text-sm text-muted-foreground">Access settings unavailable.</p>;
  }

  return (
    <PlatformBusinessAccessPanel
      key={`${access.businessId}-${access.subscription?.updatedAt ?? "none"}`}
      business={business}
      access={access}
      canUpdate={canUpdate}
      onNavigateToPayments={onNavigateToPayments}
      onNavigateToSubscriptions={onNavigateToSubscriptions}
    />
  );
}

function PlatformBusinessAccessPanel({
  business,
  access,
  canUpdate,
  onNavigateToPayments,
  onNavigateToSubscriptions,
}: {
  business: Business;
  access: BusinessAccess;
  canUpdate: boolean;
  onNavigateToPayments?: (options?: { recordPayment?: boolean }) => void;
  onNavigateToSubscriptions?: () => void;
}) {
  const queryClient = useQueryClient();
  const planGroupsListKey = queryKeys.platform.planGroups.list({
    status: "PUBLISHED",
    limit: 50,
  });

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: planGroupsListKey,
      queryFn: () =>
        listPlatformPlanGroups({ page: 1, limit: 50, status: "PUBLISHED" }),
    });
  }, [queryClient, planGroupsListKey]);

  const [changePackageOpen, setChangePackageOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [changeSnapshotOpen, setChangeSnapshotOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [extendTrialOpen, setExtendTrialOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("14");
  const [extendTrialEnd, setExtendTrialEnd] = useState("");

  const invalidateAccess = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.access(business.id),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.subscriptionEvents(business.id),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.subscriptionPayments(business.id),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.detail(business.id),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.all(),
    });
  };

  const actionFlow = useSubscriptionActionFlow({
    businessId: business.id,
    onSuccess: invalidateAccess,
  });

  const extendPreviewMutation = useMutation({
    mutationFn: () =>
      previewPlatformBusinessAccessAction(business.id, {
        actionKey: "EXTEND_TRIAL",
        input: {
          days: extendTrialEnd ? undefined : Number(extendDays) || 14,
          currentPeriodEnd: extendTrialEnd || undefined,
        },
      }),
    onSuccess: (result) => {
      actionFlow.openPreview(
        result,
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
    if (!action.enabled) return;

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
        onNavigateToPayments?.({ recordPayment: true });
        return;
      case "REACTIVATE_BUSINESS":
        setReactivateOpen(true);
        return;
      case "EXTEND_TRIAL":
        setExtendTrialOpen(true);
        return;
      case "MANUAL_ADJUSTMENT":
        toast.message("Use the Advanced section below for manual adjustments.");
        return;
      default:
        actionFlow.startPreview(action);
    }
  };

  const availableActions = access.availableActions ?? [];

  return (
    <div className="space-y-6">
      <BusinessAccessSummaryCard access={access} />
      <CurrentPaymentSummaryCard access={access} />

      <RecommendedActionCard
        action={access.recommendedAction}
        canUpdate={canUpdate}
        onAction={handleAction}
        isLoading={actionFlow.isPreviewing || actionFlow.isExecuting}
      />

      <SubscriptionActionGroups
        actions={availableActions}
        excludeActionKey={access.recommendedAction?.key}
        canUpdate={canUpdate}
        onAction={handleAction}
        isLoading={actionFlow.isPreviewing || actionFlow.isExecuting}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">History & Records</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNavigateToSubscriptions}
          >
            Subscription History
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigateToPayments?.()}
          >
            Payment Records
          </Button>
        </CardContent>
      </Card>

      <AccessAdvancedSection
        businessId={business.id}
        access={access}
        canUpdate={canUpdate}
        onSuccess={invalidateAccess}
      />

      <ActionImpactPreviewDialog
        open={actionFlow.previewOpen}
        onOpenChange={actionFlow.setPreviewOpen}
        preview={actionFlow.preview}
        actionLabel={actionFlow.pendingAction?.label ?? "Action"}
        isExecuting={actionFlow.isExecuting}
        onConfirm={actionFlow.confirmAction}
      />

      <ChangePackageDialog
        businessId={business.id}
        access={access}
        open={changePackageOpen}
        onOpenChange={setChangePackageOpen}
        onSuccess={invalidateAccess}
      />

      <MarkPaidDialog
        businessId={business.id}
        access={access}
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        onSuccess={invalidateAccess}
      />

      <ChangeSnapshotDialog
        businessId={business.id}
        currentSnapshotId={access.snapshotId}
        currentSnapshotName={access.snapshotName}
        open={changeSnapshotOpen}
        onOpenChange={setChangeSnapshotOpen}
        onSuccess={invalidateAccess}
      />

      <ReactivateBusinessDialog
        businessId={business.id}
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        onSuccess={invalidateAccess}
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
    </div>
  );
}
