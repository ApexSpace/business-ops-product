"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InstagramSetupChecklist } from "@/components/integrations/instagram-setup-checklist";
import { IntegrationResourceList } from "@/components/integrations/integration-resource-list";
import { SyncResourcesButton } from "@/components/integrations/sync-resources-button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import {
  providerSupportsResources,
  type IntegrationResourcesListResponse,
  type SyncIntegrationResourcesResponse,
} from "@/lib/integration-resources";
import { queryKeys } from "@/lib/query-keys";

export interface IntegrationResourcesPanelProps {
  providerKey: string;
  isConnected: boolean;
  canManage?: boolean;
  resourceLabel?: string | null;
  showInstagramEmptyChecklist?: boolean;
}

export function IntegrationResourcesPanel({
  providerKey,
  isConnected,
  canManage = false,
  resourceLabel,
  showInstagramEmptyChecklist = false,
}: IntegrationResourcesPanelProps) {
  const queryClient = useQueryClient();
  const supportsResources = providerSupportsResources(providerKey);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.integrations.businessResources(providerKey),
    queryFn: () =>
      apiClient<IntegrationResourcesListResponse>(
        `integrations/business/${providerKey}/resources`,
      ),
    enabled: isConnected && supportsResources,
  });

  const invalidateResources = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.integrations.businessResources(providerKey),
    });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiClient<SyncIntegrationResourcesResponse>(
        `integrations/business/${providerKey}/resources/sync`,
        { method: "POST" },
      ),
    onSuccess: async (result) => {
      if (result.synced) {
        toast.success("Resources synced successfully");
      } else if (result.message) {
        toast.message(result.message);
      }
      await invalidateResources();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selectMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiClient(`integrations/business/${providerKey}/resources/${resourceId}/select`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await invalidateResources();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unselectMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiClient(
        `integrations/business/${providerKey}/resources/${resourceId}/unselect`,
        { method: "POST" },
      ),
    onSuccess: async () => {
      await invalidateResources();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const makeDefaultMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiClient(
        `integrations/business/${providerKey}/resources/${resourceId}/make-default`,
        { method: "POST" },
      ),
    onSuccess: async () => {
      toast.success("Default resource updated");
      await invalidateResources();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!supportsResources || !isConnected) {
    return null;
  }

  const isPending =
    syncMutation.isPending ||
    selectMutation.isPending ||
    unselectMutation.isPending ||
    makeDefaultMutation.isPending;

  const label = resourceLabel ?? data?.resourceLabel ?? "Resources";
  const syncEnabled = data?.syncEnabled ?? false;
  const isGbp = providerKey === "google-business-profile";

  return (
    <div className="space-y-4 border-t border-border/70 pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium">Connected {label}</h3>
          <p className="text-xs text-muted-foreground">
            Choose which {label.toLowerCase()} this business should use.
          </p>
          {isGbp ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Google limits Business Profile API requests. Sync once, then wait about
              a minute before trying again.
            </p>
          ) : null}
        </div>
        {canManage ? (
          <SyncResourcesButton
            onSync={() => syncMutation.mutate()}
            isPending={syncMutation.isPending}
            disabled={!syncEnabled}
            label={syncEnabled ? `Sync ${label.toLowerCase()}` : "Sync unavailable"}
          />
        ) : null}
      </div>

      {!syncEnabled && canManage ? (
        <p className="text-xs text-muted-foreground">
          Resource sync will be available when provider handler is enabled.
        </p>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (data?.resources?.length ?? 0) === 0 &&
        showInstagramEmptyChecklist ? (
        <InstagramSetupChecklist />
      ) : (data?.resources?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {label.toLowerCase()} found. Try syncing resources after granting
          permissions in Meta.
        </p>
      ) : (
        <IntegrationResourceList
          resources={data?.resources ?? []}
          canManage={canManage}
          isPending={isPending}
          onSelect={(id) => selectMutation.mutate(id)}
          onUnselect={(id) => unselectMutation.mutate(id)}
          onMakeDefault={(id) => makeDefaultMutation.mutate(id)}
        />
      )}
    </div>
  );
}
