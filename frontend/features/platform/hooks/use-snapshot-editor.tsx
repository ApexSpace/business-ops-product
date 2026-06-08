"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPlatformSnapshot,
  publishPlatformSnapshot,
  updatePlatformSnapshot,
} from "@/features/platform/api/snapshots.api";
import { mergeSnapshotAssets } from "@/features/platform/schemas/snapshot-form";
import {
  hasBlockingValidationErrors,
  validateSnapshotForPublish,
  type SnapshotValidationItem,
} from "@/features/platform/utils/snapshot-validation";
import { queryKeys } from "@/lib/query/keys";
import type { Snapshot, SnapshotAssets } from "@/features/platform/types/snapshot";

export type SnapshotEditorSection =
  | "overview"
  | "labels"
  | "navigation"
  | "dashboard"
  | "crm"
  | "services"
  | "calendars"
  | "chatbots"
  | "emails"
  | "preview"
  | "advanced";

export interface SnapshotOverviewState {
  name: string;
  description: string;
}

interface SnapshotEditorContextValue {
  snapshotId: string;
  snapshot: Snapshot | undefined;
  isLoading: boolean;
  status: Snapshot["status"] | undefined;
  overview: SnapshotOverviewState;
  assets: SnapshotAssets | null;
  activeSection: SnapshotEditorSection;
  setActiveSection: (section: SnapshotEditorSection) => void;
  setOverview: (patch: Partial<SnapshotOverviewState>) => void;
  updateAssets: (patch: Partial<SnapshotAssets>) => void;
  replaceAssets: (assets: SnapshotAssets) => void;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isMovingToDraft: boolean;
  save: () => Promise<void>;
  moveToDraft: () => Promise<void>;
  publish: () => Promise<void>;
  requestPublish: () => void;
  publishValidationOpen: boolean;
  setPublishValidationOpen: (open: boolean) => void;
  publishValidationItems: SnapshotValidationItem[];
  confirmPublish: () => Promise<void>;
  canManage: boolean;
}

const SnapshotEditorContext = createContext<SnapshotEditorContextValue | null>(
  null,
);

function serializeEditorState(
  overview: SnapshotOverviewState,
  assets: SnapshotAssets | null,
): string {
  return JSON.stringify({ overview, assets });
}

export function SnapshotEditorProvider({
  snapshotId,
  canManage,
  children,
}: {
  snapshotId: string;
  canManage: boolean;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] =
    useState<SnapshotEditorSection>("overview");
  const [publishValidationOpen, setPublishValidationOpen] = useState(false);
  const [overview, setOverviewState] = useState<SnapshotOverviewState>({
    name: "",
    description: "",
  });
  const [assets, setAssets] = useState<SnapshotAssets | null>(null);
  const savedFingerprint = useRef<string>("");

  const { data: snapshot, isLoading } = useQuery({
    queryKey: queryKeys.platform.snapshots.detail(snapshotId),
    queryFn: () => getPlatformSnapshot(snapshotId),
    enabled: !!snapshotId,
  });

  useEffect(() => {
    if (!snapshot) return;
    const nextOverview = {
      name: snapshot.name,
      description: snapshot.description ?? "",
    };
    setOverviewState(nextOverview);
    setAssets(snapshot.assets);
    savedFingerprint.current = serializeEditorState(nextOverview, snapshot.assets);
  }, [snapshot]);

  const setOverview = useCallback((patch: Partial<SnapshotOverviewState>) => {
    setOverviewState((current) => ({ ...current, ...patch }));
  }, []);

  const updateAssets = useCallback((patch: Partial<SnapshotAssets>) => {
    setAssets((current) => {
      if (!current) return current;
      return mergeSnapshotAssets(current, patch);
    });
  }, []);

  const replaceAssets = useCallback((next: SnapshotAssets) => {
    setAssets(next);
  }, []);

  const isDirty = useMemo(() => {
    if (!assets) return false;
    return serializeEditorState(overview, assets) !== savedFingerprint.current;
  }, [overview, assets]);

  const publishValidationItems = useMemo(() => {
    if (!assets) return [];
    return validateSnapshotForPublish({
      name: overview.name,
      assets,
    });
  }, [overview.name, assets]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!assets) throw new Error("Snapshot assets not loaded");
      return updatePlatformSnapshot(snapshotId, {
        name: overview.name.trim(),
        description: overview.description.trim() || undefined,
        assets,
      });
    },
    onSuccess: (updated) => {
      const nextOverview = {
        name: updated.name,
        description: updated.description ?? "",
      };
      setOverviewState(nextOverview);
      setAssets(updated.assets);
      savedFingerprint.current = serializeEditorState(
        nextOverview,
        updated.assets,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.detail(snapshotId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.all(),
      });
      toast.success("Snapshot saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishPlatformSnapshot(snapshotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.detail(snapshotId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.all(),
      });
      setPublishValidationOpen(false);
      toast.success("Snapshot published");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const moveToDraftMutation = useMutation({
    mutationFn: async () => {
      if (!assets) throw new Error("Snapshot assets not loaded");
      return updatePlatformSnapshot(snapshotId, {
        name: overview.name.trim(),
        description: overview.description.trim() || undefined,
        assets,
        status: "DRAFT",
      });
    },
    onSuccess: (updated) => {
      const nextOverview = {
        name: updated.name,
        description: updated.description ?? "",
      };
      setOverviewState(nextOverview);
      setAssets(updated.assets);
      savedFingerprint.current = serializeEditorState(nextOverview, updated.assets);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.detail(snapshotId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.all(),
      });
      toast.success("Snapshot moved to draft");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const save = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);

  const moveToDraft = useCallback(async () => {
    await moveToDraftMutation.mutateAsync();
  }, [moveToDraftMutation]);

  const confirmPublish = useCallback(async () => {
    if (!assets) return;
    if (hasBlockingValidationErrors(publishValidationItems)) return;
    if (isDirty) {
      await saveMutation.mutateAsync();
    }
    await publishMutation.mutateAsync();
  }, [
    assets,
    isDirty,
    publishValidationItems,
    saveMutation,
    publishMutation,
  ]);

  const requestPublish = useCallback(() => {
    if (!assets) return;
    setPublishValidationOpen(true);
  }, [assets]);

  const publish = useCallback(async () => {
    requestPublish();
  }, [requestPublish]);

  const value = useMemo<SnapshotEditorContextValue>(
    () => ({
      snapshotId,
      snapshot,
      isLoading,
      status: snapshot?.status,
      overview,
      assets,
      activeSection,
      setActiveSection,
      setOverview,
      updateAssets,
      replaceAssets,
      isDirty,
      isSaving: saveMutation.isPending,
      isPublishing: publishMutation.isPending,
      isMovingToDraft: moveToDraftMutation.isPending,
      save,
      moveToDraft,
      publish,
      requestPublish,
      publishValidationOpen,
      setPublishValidationOpen,
      publishValidationItems,
      confirmPublish,
      canManage,
    }),
    [
      snapshotId,
      snapshot,
      isLoading,
      overview,
      assets,
      activeSection,
      setOverview,
      updateAssets,
      replaceAssets,
      isDirty,
      saveMutation.isPending,
      publishMutation.isPending,
      moveToDraftMutation.isPending,
      save,
      moveToDraft,
      publish,
      requestPublish,
      publishValidationOpen,
      publishValidationItems,
      confirmPublish,
      canManage,
    ],
  );

  return (
    <SnapshotEditorContext.Provider value={value}>
      {children}
    </SnapshotEditorContext.Provider>
  );
}

export function useSnapshotEditor() {
  const context = useContext(SnapshotEditorContext);
  if (!context) {
    throw new Error("useSnapshotEditor must be used within SnapshotEditorProvider");
  }
  return context;
}

export function useSnapshotEditorAssets(): SnapshotAssets {
  const { assets } = useSnapshotEditor();
  if (!assets) {
    throw new Error("Snapshot assets not loaded");
  }
  return assets;
}
