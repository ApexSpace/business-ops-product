"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PlatformBusinessAuditTab } from "@/features/platform/components/platform-business-audit-tab";
import { PlatformBusinessBillingTab } from "@/features/platform/components/platform-business-billing-tab";
import {
  PlatformBusinessDetailTabs,
  type PlatformBusinessDetailTab,
} from "@/features/platform/components/platform-business-detail-tabs";
import { PlatformBusinessMembersTab } from "@/features/platform/components/platform-business-members-tab";
import { PlatformBusinessOverviewTab } from "@/features/platform/components/platform-business-overview-tab";
import { PlatformBusinessProfileTab } from "@/features/platform/components/platform-business-profile-tab";
import { usePlatformBusinessDetail } from "@/features/platform/hooks/use-platform-business-detail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function renderTabContent(
  tab: PlatformBusinessDetailTab,
  props: ReturnType<typeof usePlatformBusinessDetail>,
) {
  const {
    id,
    business,
    utilization,
    utilizationLoading,
    members,
    recentAuditLogs,
    subscription,
    plans,
    canUpdate,
    canBilling,
    canSetOwner,
    setActiveTab,
    selectedPlanId,
    setSelectedPlanId,
    selectedStatus,
    setSelectedStatus,
    assignSubscriptionMutation,
  } = props;

  if (!business) return null;

  switch (tab) {
    case "overview":
      return (
        <PlatformBusinessOverviewTab
          business={business}
          utilization={utilization}
          utilizationLoading={utilizationLoading}
          subscription={subscription}
          recentAuditLogs={recentAuditLogs}
          onNavigateTab={setActiveTab}
        />
      );
    case "profile":
      return (
        <PlatformBusinessProfileTab
          business={business}
          canUpdate={canUpdate}
        />
      );
    case "team":
      return (
        <PlatformBusinessMembersTab
          businessId={id}
          members={members}
          canInvite={canUpdate}
          canSetOwner={canSetOwner}
        />
      );
    case "billing":
      return (
        <PlatformBusinessBillingTab
          subscription={subscription}
          plans={plans}
          canBilling={canBilling}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          assignSubscriptionPending={assignSubscriptionMutation.isPending}
          onAssignSubscription={() => assignSubscriptionMutation.mutate()}
        />
      );
    case "activity":
      return <PlatformBusinessAuditTab businessId={id} />;
    default:
      return null;
  }
}

export function PlatformBusinessDetailPage() {
  const detail = usePlatformBusinessDetail();
  const {
    business,
    isLoading,
    canUpdate,
    canDelete,
    activeTab,
    setActiveTab,
    openProfileTab,
    deleteOpen,
    setDeleteOpen,
    deleteMutation,
  } = detail;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!business) return <p>Business not found</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page-title">{business.name}</h1>
            <StatusBadge status={business.status} domain="business" />
          </div>
        }
        description={`Slug: ${business.slug}`}
        actions={
          <div className="flex items-center gap-2">
            {canUpdate ? (
              <Button type="button" variant="outline" onClick={openProfileTab}>
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            ) : null}
          </div>
        }
      />

      <PlatformBusinessDetailTabs
        value={activeTab}
        onValueChange={setActiveTab}
      />

      <div className="min-h-[320px]">
        {renderTabContent(activeTab, detail)}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete business?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{business.name}</strong> and
              all related data including members, contacts, leads, pipelines,
              and tags. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete business"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
