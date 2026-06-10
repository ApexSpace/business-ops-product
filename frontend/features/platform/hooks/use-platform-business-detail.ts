"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSetPageMetadata } from "@/lib/runtime/page-metadata-context";
import {
  deletePlatformBusiness,
  getPlatformBusiness,
  getPlatformBusinessMembers,
  getPlatformBusinessUtilization,
} from "@/features/platform/api/platform.api";
import { getPlatformBusinessAccess } from "@/features/platform/api/business-access.api";
import {
  PLATFORM_BUSINESS_DETAIL_TABS,
  type PlatformBusinessDetailTab,
} from "@/features/platform/components/platform-business-detail-tabs";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";

const VALID_TABS = new Set<PlatformBusinessDetailTab>(
  PLATFORM_BUSINESS_DETAIL_TABS.map((tab) => tab.value),
);

export function usePlatformBusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setPageMetadata = useSetPageMetadata();
  const canUpdate = useCan(PERMISSIONS["platform.businesses.update"]);
  const canDelete = useCan(PERMISSIONS["platform.businesses.delete"]);
  const canSetOwner = useCan(PERMISSIONS["platform.businesses.update"]);
  const tabParam = searchParams.get("tab");
  const normalizedTabParam =
    tabParam === "subscription" ? "subscriptions" : tabParam;
  const activeTab: PlatformBusinessDetailTab = VALID_TABS.has(
    normalizedTabParam as PlatformBusinessDetailTab,
  )
    ? (normalizedTabParam as PlatformBusinessDetailTab)
    : "overview";
  const paymentsAutoOpen = searchParams.get("recordPayment") === "1";
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: business, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.detail(id),
    queryFn: () => getPlatformBusiness(id),
  });

  const { data: access, isLoading: accessLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.access(id),
    queryFn: () => getPlatformBusinessAccess(id),
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
      breadcrumbs: [
        { label: "Businesses", href: "/platform/businesses" },
        { label: business.name },
      ],
    });
  }, [business, setPageMetadata]);

  const setActiveTab = useCallback(
    (tab: PlatformBusinessDetailTab, options?: { recordPayment?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      if (options?.recordPayment) {
        params.set("recordPayment", "1");
      } else {
        params.delete("recordPayment");
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const openProfileTab = () => setActiveTab("profile");
  const openPaymentsTab = (options?: { recordPayment?: boolean }) =>
    setActiveTab("payments", options);
  const openSubscriptionsTab = () => setActiveTab("subscriptions");

  return {
    id,
    business,
    access,
    accessLoading,
    isLoading,
    utilization,
    utilizationLoading,
    members,
    canUpdate,
    canDelete,
    canSetOwner,
    activeTab,
    setActiveTab,
    openProfileTab,
    openPaymentsTab,
    openSubscriptionsTab,
    paymentsAutoOpen,
    deleteOpen,
    setDeleteOpen,
    deleteMutation,
  };
}
