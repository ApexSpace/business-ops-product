"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSetPageMetadata } from "@/lib/runtime/page-metadata-context";
import type { PlatformCapabilityDetailTab } from "@/features/platform/components/capabilities/platform-capability-detail-tabs";
import {
  deletePlatformCapability,
  getPlatformCapability,
  getPlatformRegistryModules,
  listPlatformCapabilityModules,
  movePlatformCapabilityToDraft,
  publishPlatformCapability,
  syncPlatformCapabilityModules,
  updatePlatformCapability,
} from "@/features/platform/api/capabilities.api";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { ModuleSelections } from "@/features/platform/types/capability";
import {
  allOptionsEnabled,
  areModuleSelectionsEqual,
  buildModuleSelections,
  emptyOptions,
  moduleSelectionsToSyncPayload,
  recomputeModuleEnabled,
} from "@/features/platform/utils/module-options";

export function usePlatformCapabilityDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setPageMetadata = useSetPageMetadata();
  const canManage = useCan(PERMISSIONS["platform.capabilities.manage"]);
  const tabParam = searchParams.get("tab");
  const initialTab: PlatformCapabilityDetailTab =
    tabParam === "modules" ? "modules" : "overview";
  const [activeTab, setActiveTab] =
    useState<PlatformCapabilityDetailTab>(initialTab);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moduleSelections, setModuleSelections] =
    useState<ModuleSelections | null>(null);

  const { data: capability, isLoading } = useQuery({
    queryKey: queryKeys.platform.capabilities.detail(id),
    queryFn: () => getPlatformCapability(id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.platform.capabilities.all(),
    });

  const publishMutation = useMutation({
    mutationFn: () => publishPlatformCapability(id),
    onSuccess: () => {
      toast.success("Capability published");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const draftMutation = useMutation({
    mutationFn: () => movePlatformCapabilityToDraft(id),
    onSuccess: () => {
      toast.success("Moved to draft");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlatformCapability(id),
    onSuccess: () => {
      toast.success("Capability deleted");
      void invalidate();
      setDeleteOpen(false);
      router.push("/platform/capabilities");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      updatePlatformCapability(id, body),
    onSuccess: () => {
      toast.success("Capability updated");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: moduleCatalog = [], isLoading: isModuleCatalogLoading } =
    useQuery({
      queryKey: queryKeys.platform.capabilities.registryModules(),
      queryFn: () => getPlatformRegistryModules(),
    });

  const { data: assignedModules = [], isLoading: isAssignedModulesLoading } =
    useQuery({
      queryKey: queryKeys.platform.capabilities.modules(id),
      queryFn: () => listPlatformCapabilityModules(id),
    });

  const serverModuleSelections = useMemo(
    () => buildModuleSelections(moduleCatalog, assignedModules),
    [moduleCatalog, assignedModules],
  );

  const effectiveModuleSelections = moduleSelections ?? serverModuleSelections;

  const isModulesDirty = useMemo(() => {
    if (moduleSelections === null) return false;
    return !areModuleSelectionsEqual(moduleSelections, serverModuleSelections);
  }, [moduleSelections, serverModuleSelections]);

  const saveModulesMutation = useMutation({
    mutationFn: (selections: ModuleSelections) =>
      syncPlatformCapabilityModules(
        id,
        moduleSelectionsToSyncPayload(selections),
      ),
    onSuccess: () => {
      toast.success("Modules saved");
      setModuleSelections(null);
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleModuleMaster = useCallback(
    (moduleKey: string, enabled: boolean) => {
      if (!canManage) return;
      const catalogMod = moduleCatalog.find((m) => m.moduleKey === moduleKey);
      if (!catalogMod) return;

      setModuleSelections((prev) => {
        const base = { ...(prev ?? serverModuleSelections) };
        base[moduleKey] = {
          enabled,
          options: enabled
            ? allOptionsEnabled(catalogMod.availableOptions)
            : emptyOptions(catalogMod.availableOptions),
        };
        return base;
      });
    },
    [canManage, moduleCatalog, serverModuleSelections],
  );

  const toggleModuleOption = useCallback(
    (moduleKey: string, optionKey: string, enabled: boolean) => {
      if (!canManage) return;
      const catalogMod = moduleCatalog.find((m) => m.moduleKey === moduleKey);
      if (!catalogMod) return;

      setModuleSelections((prev) => {
        const base = { ...(prev ?? serverModuleSelections) };
        const current = base[moduleKey] ?? {
          enabled: false,
          options: emptyOptions(catalogMod.availableOptions),
        };
        const options = {
          ...current.options,
          [optionKey]: enabled,
        };
        base[moduleKey] = {
          options,
          enabled: recomputeModuleEnabled(options),
        };
        return base;
      });
    },
    [canManage, moduleCatalog, serverModuleSelections],
  );

  const resetModuleSelection = () => setModuleSelections(null);

  const saveModules = () => {
    saveModulesMutation.mutate(effectiveModuleSelections);
  };

  const isSaving =
    updateMutation.isPending || saveModulesMutation.isPending;

  useEffect(() => {
    if (!capability) return;
    setPageMetadata({
      title: capability.name,
      description: capability.description ?? undefined,
      breadcrumbs: [
        { label: "Capabilities", href: "/platform/capabilities" },
        { label: capability.name },
      ],
    });
  }, [capability, setPageMetadata]);

  const saveOverview = (values: { name: string; description?: string }) => {
    updateMutation.mutate({
      name: values.name,
      description: values.description || undefined,
    });
  };

  return {
    id,
    capability,
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
    moduleCatalog,
    assignedModules,
    isAssignedModulesLoading: isModuleCatalogLoading || isAssignedModulesLoading,
    effectiveModuleSelections,
    isModulesDirty,
    toggleModuleMaster,
    toggleModuleOption,
    resetModuleSelection,
    saveModules,
    saveModulesMutation,
    isSaving,
  };
}
