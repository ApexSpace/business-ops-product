"use client";

import { useParams } from "next/navigation";
import { useAppRouter } from "@/hooks/use-app-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useSetPageMetadata } from "@/lib/page-metadata-context";
import { EditBusinessDialog } from "@/components/platform/edit-business-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { invalidatePlatformBusinesses } from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import { canDeleteBusiness, canManageBilling, canUpdateBusiness } from "@/lib/permissions";
import type {
  AuditLog,
  BillingSubscription,
  Business,
  BusinessMember,
  PaginatedResult,
  Plan,
  SubscriptionStatus,
} from "@/types/api";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { apiPhoneToFormValue } from "@/lib/phone";
import { subscriptionStatusOptions } from "@/lib/select-options";
import { SetBusinessOwnerDialog } from "@/components/platform/set-business-owner-dialog";

export default function PlatformBusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useAppRouter();
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const setPageMetadata = useSetPageMetadata();
  const canUpdate = canUpdateBusiness(jwt?.platformRole);
  const canDelete = canDeleteBusiness(jwt?.platformRole);
  const canBilling = canManageBilling(jwt?.platformRole);
  const canSetOwner = jwt?.platformRole === "SUPER_ADMIN" || jwt?.platformRole === "PLATFORM_ADMIN";
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: business, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.detail(id),
    queryFn: () => apiClient<Business>(`platform/businesses/${id}`),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.platform.businesses.members(id),
    queryFn: () =>
      apiClient<BusinessMember[]>(`platform/businesses/${id}/members`),
  });

  const { data: auditLogs } = useQuery({
    queryKey: queryKeys.platform.businesses.audit(id, { page: 1, limit: 50 }),
    queryFn: () =>
      apiClient<PaginatedResult<AuditLog>>(
        `platform/businesses/${id}/audit-logs`,
        { searchParams: { page: 1, limit: 50 } },
      ),
  });

  const { data: subscription } = useQuery({
    queryKey: queryKeys.platform.businesses.subscription(id),
    queryFn: () =>
      apiClient<BillingSubscription | null>(
        `platform/billing/businesses/${id}/subscription`,
      ),
  });

  const { data: plans } = useQuery({
    queryKey: queryKeys.platform.plans.active(),
    queryFn: () =>
      apiClient<PaginatedResult<Plan>>("platform/plans", {
        searchParams: { page: 1, limit: 50, status: "ACTIVE" },
      }),
    enabled: canBilling,
  });

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<SubscriptionStatus>("TRIALING");

  const assignSubscriptionMutation = useMutation({
    mutationFn: () =>
      apiClient<BillingSubscription>(
        `platform/billing/businesses/${id}/subscription`,
        {
          method: subscription ? "PATCH" : "POST",
          body: {
            planId: selectedPlanId,
            status: selectedStatus,
          },
        },
      ),
    onSuccess: () => {
      toast.success("Subscription updated");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.businesses.subscription(id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.billing.all(),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient(`platform/businesses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Business deleted");
      void invalidatePlatformBusinesses(queryClient);
      router.push("/platform/businesses");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!business) return;
    setPageMetadata({
      title: business.name,
      description: `Slug: ${business.slug}`,
      breadcrumbs: [
        { label: "Businesses", href: "/platform/businesses" },
        { label: business.name },
      ],
    });
  }, [business, setPageMetadata]);

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
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Contact</dt>
              <dd>
                {business.displayName ||
                  [business.firstName, business.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{business.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>
                {apiPhoneToFormValue(
                  null,
                  business.phoneCountryCode,
                  business.phoneNumber,
                ) || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Industry</dt>
              <dd>{business.industry?.name ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd>
                {[
                  business.address,
                  [business.city, business.state].filter(Boolean).join(", "),
                  business.country,
                  business.zip,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Website</dt>
              <dd>
                {business.website ? (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {business.website}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Timezone</dt>
              <dd>{business.timezone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs">{business.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(business.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </TabsContent>
        <TabsContent value="members">
          {canSetOwner ? (
            <div className="mb-3 flex items-center justify-end">
              <SetBusinessOwnerDialog businessId={id} />
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.user.email}</TableCell>
                  <TableCell>
                    {[m.user.firstName, m.user.lastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>{m.status}</TableCell>
                </TableRow>
              ))}
              {!members?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No members
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="billing" className="space-y-4">
          {subscription ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Plan</dt>
                <dd>{subscription.planName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="secondary">{subscription.status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Monthly</dt>
                <dd>${subscription.priceMonthly}/mo</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Period end</dt>
                <dd>
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No subscription assigned yet.
            </p>
          )}
          {canBilling ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Plan</p>
                <SearchableSelect
                  items={
                    plans?.items.map((p) => ({
                      value: p.id,
                      label: `${p.name} ($${p.priceMonthly}/mo)`,
                    })) ?? []
                  }
                  value={selectedPlanId || subscription?.planId || null}
                  onValueChange={(v) => setSelectedPlanId(v ?? "")}
                  placeholder="Select plan"
                  triggerClassName="w-[220px]"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Status</p>
                <SearchableSelect
                  items={subscriptionStatusOptions}
                  value={selectedStatus}
                  onValueChange={(v) =>
                    v && setSelectedStatus(v as SubscriptionStatus)
                  }
                  triggerClassName="w-[160px]"
                />
              </div>
              <Button
                type="button"
                disabled={
                  assignSubscriptionMutation.isPending ||
                  !(selectedPlanId || subscription?.planId)
                }
                onClick={() => assignSubscriptionMutation.mutate()}
              >
                {assignSubscriptionMutation.isPending
                  ? "Saving…"
                  : subscription
                    ? "Update subscription"
                    : "Assign plan"}
              </Button>
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="audit">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs?.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
                  </TableCell>
                  <TableCell>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {!auditLogs?.items.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No audit logs
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
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
