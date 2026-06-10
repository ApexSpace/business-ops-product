"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSetPageMetadata } from "@/lib/runtime/page-metadata-context";
import type { PlatformPlanGroupDetailTab } from "@/features/platform/components/plan-groups/platform-plan-group-detail-tabs";
import {
  deletePlatformPlanGroup,
  getPlatformPlanGroup,
  getPlatformPlanGroupEmbed,
  getPlatformPlanGroupPreview,
  listPlatformPlanGroupFeatureRows,
  listPlatformPlanGroupTiers,
  movePlatformPlanGroupToDraft,
  publishPlatformPlanGroup,
  updatePlatformPlanGroup,
  updatePlatformPlanGroupEmbed,
} from "@/features/platform/api/plan-groups.api";
import type {
  PlanGroupOverviewValues,
  PlanGroupStyleValues,
} from "@/features/platform/schemas/plan-group-form";
import { styleValuesToDesignSettings } from "@/features/platform/components/plan-groups/plan-group-style-tab";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  getPricingEmbedCode,
} from "@/lib/config/public-backend-url";

const VALID_TABS = new Set<PlatformPlanGroupDetailTab>([
  "overview",
  "tiers",
  "style",
  "preview",
]);

export function usePlatformPlanGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setPageMetadata = useSetPageMetadata();
  const canManage = useCan(PERMISSIONS["platform.plan_groups.manage"]);
  const tabParam = searchParams.get("tab");
  const initialTab: PlatformPlanGroupDetailTab = VALID_TABS.has(
    tabParam as PlatformPlanGroupDetailTab,
  )
    ? (tabParam as PlatformPlanGroupDetailTab)
    : "overview";
  const [activeTab, setActiveTab] =
    useState<PlatformPlanGroupDetailTab>(initialTab);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: planGroup, isLoading } = useQuery({
    queryKey: queryKeys.platform.planGroups.detail(id),
    queryFn: () => getPlatformPlanGroup(id),
  });

  const { data: tiers = [] } = useQuery({
    queryKey: queryKeys.platform.planGroups.tiers(id),
    queryFn: () => listPlatformPlanGroupTiers(id),
    enabled: Boolean(id),
  });

  const { data: featureRows = [] } = useQuery({
    queryKey: queryKeys.platform.planGroups.featureRows(id),
    queryFn: () => listPlatformPlanGroupFeatureRows(id),
    enabled: Boolean(id),
  });

  const { data: embed, isLoading: embedLoading } = useQuery({
    queryKey: queryKeys.platform.planGroups.embed(id),
    queryFn: () => getPlatformPlanGroupEmbed(id),
    enabled: Boolean(id),
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: queryKeys.platform.planGroups.preview(id),
    queryFn: () => getPlatformPlanGroupPreview(id),
    enabled:
      Boolean(id) && (activeTab === "preview" || activeTab === "style"),
  });

  const capabilityCount = useMemo(
    () =>
      tiers.reduce((sum, tier) => sum + tier.capabilities.length, 0),
    [tiers],
  );

  const featureCount = useMemo(
    () =>
      tiers.reduce((sum, tier) => sum + (tier.features?.length ?? 0), 0),
    [tiers],
  );

  const invalidate = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.planGroups.all(),
      }),
    [queryClient],
  );

  useEffect(() => {
    if (planGroup) {
      setPageMetadata({ title: planGroup.name });
    }
  }, [planGroup, setPageMetadata]);

  const publishMutation = useMutation({
    mutationFn: () => publishPlatformPlanGroup(id),
    onSuccess: () => {
      toast.success("Plan group published");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const draftMutation = useMutation({
    mutationFn: () => movePlatformPlanGroupToDraft(id),
    onSuccess: () => {
      toast.success("Moved to draft");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlatformPlanGroup(id),
    onSuccess: () => {
      toast.success("Plan group deleted");
      void invalidate();
      setDeleteOpen(false);
      router.push("/platform/plan-groups");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      updatePlatformPlanGroup(id, body),
    onSuccess: () => {
      toast.success("Plan group updated");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveOverviewMutation = useMutation({
    mutationFn: async (values: PlanGroupOverviewValues) => {
      await updatePlatformPlanGroup(id, {
        name: values.name,
        description: values.description?.trim() ?? "",
        currency: values.currency,
        billingCycles: values.billingCycles,
        snapshotId: values.snapshotId?.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Plan group updated");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveStyleMutation = useMutation({
    mutationFn: async (values: PlanGroupStyleValues) => {
      const designSettings = styleValuesToDesignSettings(values);
      await updatePlatformPlanGroup(id, { designSettings });
      await updatePlatformPlanGroupEmbed(id, {
        showMonthlyYearlyToggle: values.showMonthlyYearlyToggle,
        showSetupFee: values.showSetupFee,
        showTrialDays: values.showTrialDays,
        showCapabilities: values.showCapabilities,
        showTierFeatures: values.showTierFeatures,
        showFeatureComparison: values.showFeatureComparison,
      });
    },
    onSuccess: () => {
      toast.success("Style settings saved");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveOverview = (values: PlanGroupOverviewValues) => {
    saveOverviewMutation.mutate(values);
  };

  const saveStyle = (values: PlanGroupStyleValues) => {
    saveStyleMutation.mutate(values);
  };

  const copyEmbedCode = async () => {
    if (!planGroup) return;
    const code = getPricingEmbedCode(planGroup.id);
    if (!code) {
      toast.error("Public backend URL is not configured");
      return;
    }
    await navigator.clipboard.writeText(code);
    toast.success("Embed code copied");
  };

  return {
    id,
    planGroup,
    tiers,
    featureRows,
    embed,
    embedLoading,
    preview,
    previewLoading,
    capabilityCount,
    featureCount,
    isLoading,
    canManage,
    activeTab,
    setActiveTab,
    deleteOpen,
    setDeleteOpen,
    publishMutation,
    draftMutation,
    deleteMutation,
    updateMutation,
    saveOverview,
    saveStyle,
    copyEmbedCode,
    invalidate,
    isSaving:
      updateMutation.isPending ||
      saveOverviewMutation.isPending ||
      saveStyleMutation.isPending,
  };
}
