"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PlatformBusinessAccessTab } from "@/features/platform/components/platform-business-access-tab";
import { PlatformBusinessAuditTab } from "@/features/platform/components/platform-business-audit-tab";
import { PlatformBusinessPaymentsTab } from "@/features/platform/components/platform-business-payments-tab";
import { PlatformBusinessSubscriptionsTab } from "@/features/platform/components/platform-business-subscriptions-tab";
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
    access,
    canUpdate,
    canSetOwner,
    openPaymentsTab,
    paymentsAutoOpen,
    setActiveTab,
    openSubscriptionsTab,
    accessLoading,
  } = props;

  if (!business) return null;

  switch (tab) {
    case "overview":
      return (
        <PlatformBusinessOverviewTab
          business={business}
          access={access}
          utilization={utilization}
          utilizationLoading={utilizationLoading}
        />
      );
    case "access":
      return (
        <PlatformBusinessAccessTab
          business={business}
          canUpdate={canUpdate}
          onNavigateToSubscriptions={openSubscriptionsTab}
          onNavigateToPayments={openPaymentsTab}
        />
      );
    case "subscriptions":
      return (
        <PlatformBusinessSubscriptionsTab
          businessId={id}
          access={access}
          accessLoading={accessLoading}
          canUpdate={canUpdate}
          onManageAccess={() => setActiveTab("access")}
          onRecordPayment={() => openPaymentsTab({ recordPayment: true })}
        />
      );
    case "payments":
      return (
        <PlatformBusinessPaymentsTab
          businessId={id}
          canUpdate={canUpdate}
          autoOpenRecord={paymentsAutoOpen}
          onAutoOpenConsumed={() => setActiveTab("payments")}
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
