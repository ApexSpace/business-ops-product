"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IntegrationEmptyState } from "@/components/integrations/integration-empty-state";
import { IntegrationResourceList } from "@/components/integrations/integration-resource-list";
import { SyncResourcesButton } from "@/components/integrations/sync-resources-button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { getIntegrationManageCopy } from "@/lib/integration-manage-copy";
import {
  providerSupportsResources,
  type IntegrationResourcesListResponse,
  type SyncIntegrationResourcesResponse,
} from "@/lib/integration-resources";
import { getIntegrationReconnectLabel } from "@/lib/integrations";
import { queryKeys } from "@/lib/query-keys";

export interface IntegrationResourcesPanelProps {
  providerKey: string;
  isConnected: boolean;
  canManage?: boolean;
  onReconnect?: () => void;
}

export function IntegrationResourcesPanel({
  providerKey,
  isConnected,
  canManage = false,
  onReconnect,
}: IntegrationResourcesPanelProps) {
  const queryClient = useQueryClient();
  const supportsResources = providerSupportsResources(providerKey);
  const copy = getIntegrationManageCopy(providerKey);

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
      const count = result.resources?.length ?? 0;
      if (count > 0) {
        toast.success(copy.syncSuccessToast(count));
      } else {
        toast.message(copy.syncEmptyToast);
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
      toast.success("Default updated");
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

  const syncEnabled = data?.syncEnabled ?? false;
  const resources = data?.resources ?? [];
  const isGbp = providerKey === "google-business-profile";

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium">{copy.resourcesSectionLabel}</h3>
        {canManage ? (
          <SyncResourcesButton
            onSync={() => syncMutation.mutate()}
            isPending={syncMutation.isPending}
            disabled={!syncEnabled}
            label={
              syncEnabled
                ? copy.syncButtonLabel
                : "Sync unavailable"
            }
          />
        ) : null}
      </div>

      {isGbp ? (
        <p className="text-xs text-muted-foreground">
          Google limits how often profiles can be refreshed. Sync once, then wait
          about a minute before trying again.
        </p>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : resources.length === 0 ? (
        <IntegrationEmptyState
          copy={copy.emptyState}
          onReconnect={canManage ? onReconnect : undefined}
          reconnectLabel={getIntegrationReconnectLabel({
            key: providerKey,
            name: copy.connectionTitle,
            connectionType: "OAUTH",
          })}
          onSync={
            canManage && syncEnabled
              ? () => syncMutation.mutate()
              : undefined
          }
          syncLabel={copy.syncButtonLabel}
          isSyncPending={syncMutation.isPending}
          syncDisabled={!syncEnabled}
        />
      ) : (
        <IntegrationResourceList
          resources={resources}
          canManage={canManage}
          isPending={isPending}
          onSelect={(id) => selectMutation.mutate(id)}
          onUnselect={(id) => unselectMutation.mutate(id)}
          onMakeDefault={(id) => makeDefaultMutation.mutate(id)}
        />
      )}
    </section>
  );
}
