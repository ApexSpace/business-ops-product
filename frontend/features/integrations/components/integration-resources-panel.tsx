"use client";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IntegrationEmptyState } from "@/features/integrations/components/integration-empty-state";
import { IntegrationResourceList } from "@/features/integrations/components/integration-resource-list";
import { SyncResourcesButton } from "@/features/integrations/components/sync-resources-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listIntegrationResources,
  makeDefaultIntegrationResource,
  selectIntegrationResource,
  syncIntegrationResources,
  unselectIntegrationResource,
  type IntegrationsHostMode,
} from "@/features/integrations/api/integrations.api";
import { getIntegrationManageCopy } from "@/features/integrations/utils/integration-manage-copy";
import { providerSupportsResources } from "@/features/integrations/utils/integration-resources";
import type { InstagramAuthFlow } from "@/features/integrations/utils/integrations";
import { useCreatePinterestBoard } from "@/features/social-planner/hooks/use-create-pinterest-board";
import { queryKeys } from "@/lib/query/keys";

export interface IntegrationResourcesPanelProps {
  providerKey: string;
  isConnected: boolean;
  canManage?: boolean;
  onReconnect?: () => void;
  host?: IntegrationsHostMode;
  /** True while post-OAuth sync job is still running. */
  isSyncingAssets?: boolean;
  /** Backend integration errorMessage (e.g. no pages / no IG accounts). */
  syncErrorMessage?: string | null;
  authFlow?: InstagramAuthFlow;
}

export function IntegrationResourcesPanel({
  providerKey,
  isConnected,
  canManage = false,
  onReconnect,
  host = "business",
  isSyncingAssets = false,
  syncErrorMessage = null,
  authFlow,
}: IntegrationResourcesPanelProps) {
  const queryClient = useQueryClient();
  const supportsResources = providerSupportsResources(providerKey);
  const copy = getIntegrationManageCopy(providerKey, { authFlow });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.integrations.businessResources(providerKey, host),
    queryFn: () => listIntegrationResources(providerKey, host),
    enabled: isConnected && supportsResources,
  });

  const invalidateResources = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.integrations.businessResources(providerKey, host),
    });

  const invalidateMessagingStatus = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.integrations.messagingStatus(providerKey, host),
    });
  };

  const invalidateWhatsAppSettings = () => {
    if (providerKey !== "whatsapp") return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.whatsappSettings.overview(),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.whatsappSettings.numbers(),
    });
  };

  const syncMutation = useMutation({
    mutationFn: () => syncIntegrationResources(providerKey, host),
    onSuccess: async (result) => {
      const count = result.resourceCount;
      if (count > 0) {
        toast.success(copy.syncSuccessToast(count));
      } else {
        toast.message(copy.syncEmptyToast);
      }
      await invalidateResources();
      invalidateMessagingStatus();
      invalidateWhatsAppSettings();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selectMutation = useMutation({
    mutationFn: (resourceId: string) =>
      selectIntegrationResource(providerKey, resourceId, host),
    onSuccess: async () => {
      await invalidateResources();
      invalidateMessagingStatus();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unselectMutation = useMutation({
    mutationFn: (resourceId: string) =>
      unselectIntegrationResource(providerKey, resourceId, host),
    onSuccess: async () => {
      await invalidateResources();
      invalidateMessagingStatus();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const makeDefaultMutation = useMutation({
    mutationFn: (resourceId: string) =>
      makeDefaultIntegrationResource(providerKey, resourceId, host),
    onSuccess: async () => {
      toast.success("Default updated");
      await invalidateResources();
      invalidateMessagingStatus();
      invalidateWhatsAppSettings();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createPinterestBoardMutation = useCreatePinterestBoard();

  if (!supportsResources || !isConnected) {
    return null;
  }

  const isPending =
    syncMutation.isPending ||
    selectMutation.isPending ||
    unselectMutation.isPending ||
    makeDefaultMutation.isPending ||
    createPinterestBoardMutation.isPending;

  const resources = data?.resources ?? [];
  const syncEnabled = data?.syncEnabled === true;
  const showSyncingState =
    isSyncingAssets || (isLoading && !data) || (isFetching && !data);
  const isGbp = providerKey === "google-business-profile";
  const isWhatsApp = providerKey === "whatsapp";
  const isPinterest = providerKey === "pinterest";
  const hasWhatsAppDefault = isWhatsApp && resources.some((r) => r.isDefault);

  const handleCreatePinterestBoard = () => {
    const name = window.prompt("New Pinterest board name");
    if (!name?.trim()) return;
    createPinterestBoardMutation.mutate({ name: name.trim() });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{copy.resourcesSectionLabel}</h3>
        <div className="flex items-center gap-2">
          {isPinterest && canManage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleCreatePinterestBoard}
            >
              Add board
            </Button>
          ) : null}
          <SyncResourcesButton
            label={
              showSyncingState && !data
                ? "Syncing…"
                : syncEnabled
                  ? copy.syncButtonLabel
                  : data
                    ? "Sync unavailable"
                    : "Syncing…"
            }
            disabled={!canManage || !syncEnabled || isPending || showSyncingState}
            isPending={syncMutation.isPending}
            onSync={() => syncMutation.mutate()}
          />
        </div>
      </div>

      {showSyncingState ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-center">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            {copy.syncingAssetsTitle ?? "Finding connected resources…"}
          </p>
          <p className="text-sm text-muted-foreground">
            {copy.syncingAssetsMessage ??
              "This usually takes a few seconds after you authorize Meta."}
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : resources.length === 0 ? (
        <IntegrationEmptyState
          copy={{
            ...copy.emptyState,
            message: syncErrorMessage?.trim()
              ? syncErrorMessage
              : copy.emptyState.message,
          }}
          onReconnect={canManage ? onReconnect : undefined}
          reconnectLabel={
            providerKey === "facebook"
              ? "Reconnect Facebook"
              : providerKey === "instagram"
                ? "Reconnect Instagram"
                : "Reconnect"
          }
          onSync={
            canManage && syncEnabled
              ? () => syncMutation.mutate()
              : undefined
          }
          syncLabel={copy.syncButtonLabel}
          isSyncPending={syncMutation.isPending}
          syncDisabled={isPending}
        />
      ) : (
        <>
          {isWhatsApp && !hasWhatsAppDefault ? (
            <p className="text-sm text-muted-foreground">
              Select a default WhatsApp number to send and receive messages.
            </p>
          ) : null}
          {isGbp ? (
            <p className="text-sm text-muted-foreground">
              Select the locations your business should use. You can change this
              later.
            </p>
          ) : null}
          <IntegrationResourceList
            resources={resources}
            canManage={canManage}
            isPending={isPending}
            onSelect={(id) => selectMutation.mutate(id)}
            onUnselect={(id) => unselectMutation.mutate(id)}
            onMakeDefault={(id) => makeDefaultMutation.mutate(id)}
          />
        </>
      )}
    </div>
  );
}
