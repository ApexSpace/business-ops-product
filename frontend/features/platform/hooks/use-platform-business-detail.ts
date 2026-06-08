"use client";

import { useParams } from "next/navigation";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSetPageMetadata } from "@/lib/runtime/page-metadata-context";
import {
  assignPlatformBusinessSubscription,
  deletePlatformBusiness,
  getPlatformBusiness,
  getPlatformBusinessMembers,
  getPlatformBusinessSubscription,
  getPlatformBusinessUtilization,
  listBusinessAuditLogs,
  listPlatformPlans,
} from "@/features/platform/api/platform.api";
import type { PlatformBusinessDetailTab } from "@/features/platform/components/platform-business-detail-tabs";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { SubscriptionStatus } from "@/features/platform/types";

export function usePlatformBusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const setPageMetadata = useSetPageMetadata();
  const canUpdate = useCan(PERMISSIONS["platform.businesses.update"]);
  const canDelete = useCan(PERMISSIONS["platform.businesses.delete"]);
  const canBilling = useCan(PERMISSIONS["platform.billing.manage"]);
  const canSetOwner = useCan(PERMISSIONS["platform.businesses.update"]);
  const [activeTab, setActiveTab] =
    useState<PlatformBusinessDetailTab>("overview");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: business, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.detail(id),
    queryFn: () => getPlatformBusiness(id),
  });

  const { data: utilization, isLoading: utilizationLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.utilization(id),
    queryFn: () => getPlatformBusinessUtilization(id),
    staleTime: 60_000,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.platform.businesses.members(id),
    queryFn: () => getPlatformBusinessMembers(id),
  });

  const { data: recentAuditLogs } = useQuery({
    queryKey: queryKeys.platform.businesses.audit(id, {
      page: 1,
      limit: 5,
    }),
    queryFn: () => listBusinessAuditLogs(id, { page: 1, limit: 5 }),
  });

  const { data: subscription } = useQuery({
    queryKey: queryKeys.platform.businesses.subscription(id),
    queryFn: () => getPlatformBusinessSubscription(id),
  });

  const { data: plans } = useQuery({
    queryKey: queryKeys.platform.plans.active(),
    queryFn: () =>
      listPlatformPlans({ page: 1, limit: 50, status: "ACTIVE" }),
    enabled: canBilling,
  });

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<SubscriptionStatus>("TRIALING");

  const assignSubscriptionMutation = useMutation({
    mutationFn: () =>
      assignPlatformBusinessSubscription(
        id,
        {
          planId: selectedPlanId,
          status: selectedStatus,
        },
        Boolean(subscription),
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
    mutationFn: () => deletePlatformBusiness(id),
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

  const openProfileTab = () => setActiveTab("profile");

  return {
    id,
    business,
    isLoading,
    utilization,
    utilizationLoading,
    members,
    recentAuditLogs: recentAuditLogs?.items,
    subscription,
    plans,
    canUpdate,
    canDelete,
    canBilling,
    canSetOwner,
    activeTab,
    setActiveTab,
    openProfileTab,
    deleteOpen,
    setDeleteOpen,
    selectedPlanId,
    setSelectedPlanId,
    selectedStatus,
    setSelectedStatus,
    assignSubscriptionMutation,
    deleteMutation,
  };
}
