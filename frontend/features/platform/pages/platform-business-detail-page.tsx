"use client";

import { PageHeader } from "@/components/layout/page-header";
import { EditBusinessDialog } from "@/features/platform/components/edit-business-dialog";
import { PlatformBusinessAuditTab } from "@/features/platform/components/platform-business-audit-tab";
import { PlatformBusinessBillingTab } from "@/features/platform/components/platform-business-billing-tab";
import { PlatformBusinessMembersTab } from "@/features/platform/components/platform-business-members-tab";
import { PlatformBusinessOverviewTab } from "@/features/platform/components/platform-business-overview-tab";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export function PlatformBusinessDetailPage() {
  const {
    id,
    business,
    isLoading,
    members,
    auditLogs,
    subscription,
    plans,
    canUpdate,
    canDelete,
    canBilling,
    canSetOwner,
    editOpen,
    setEditOpen,
    deleteOpen,
    setDeleteOpen,
    selectedPlanId,
    setSelectedPlanId,
    selectedStatus,
    setSelectedStatus,
    assignSubscriptionMutation,
    deleteMutation,
  } = usePlatformBusinessDetail();

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!business) return <p>Business not found</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        description={`Slug: ${business.slug}`}
        actions={
          canUpdate || canDelete ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{business.status}</Badge>
              {canUpdate ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                >
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
          ) : (
            <Badge>{business.status}</Badge>
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="audit">Audit logs</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <PlatformBusinessOverviewTab business={business} />
        </TabsContent>
        <TabsContent value="members">
          <PlatformBusinessMembersTab
            businessId={id}
            members={members}
            canSetOwner={canSetOwner}
          />
        </TabsContent>
        <TabsContent value="billing">
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
        </TabsContent>
        <TabsContent value="audit">
          <PlatformBusinessAuditTab auditLogs={auditLogs} />
        </TabsContent>
      </Tabs>

      <EditBusinessDialog
        business={business}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

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
