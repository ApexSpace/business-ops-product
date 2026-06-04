"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { IntegrationCategoryTabs } from "@/features/integrations/components/integration-category-tabs";
import { IntegrationGrid } from "@/features/integrations/components/integration-grid";
import {
  IntegrationManageDialog,
  integrationFormToPayload,
  type IntegrationManageFormValues,
} from "@/features/integrations/components/integration-manage-dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  filterIntegrationProvidersByCategory,
  INTEGRATION_CATEGORY_LABELS,
  type IntegrationCategory,
  type IntegrationProviderWithStatus,
} from "@/features/integrations/utils/integrations";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import {
  connectPlatformIntegration,
  confirmDisconnectPlatformIntegration,
  listPlatformIntegrationProviders,
  updatePlatformIntegration,
} from "@/features/integrations/api/integrations.api";

export function PlatformIntegrationsSettings() {
  const queryClient = useQueryClient();
  const canManage = useCan(PERMISSIONS["platform.settings.manage"]);

  const [category, setCategory] = useState<IntegrationCategory | "ALL">("ALL");
  const [selectedProvider, setSelectedProvider] =
    useState<IntegrationProviderWithStatus | null>(null);
  const [dialogMode, setDialogMode] = useState<"connect" | "manage">("connect");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: queryKeys.integrations.platformProviders(),
    queryFn: () => listPlatformIntegrationProviders(),
  });

  const filteredProviders = useMemo(
    () => filterIntegrationProvidersByCategory(providers, category),
    [providers, category],
  );

  const invalidateIntegrations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.platformProviders(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.platformList(),
      }),
    ]);
  };

  const connectMutation = useMutation({
    mutationFn: ({
      providerKey,
      values,
    }: {
      providerKey: string;
      values: IntegrationManageFormValues;
    }) =>
      connectPlatformIntegration(providerKey, integrationFormToPayload(values)),
    onSuccess: async () => {
      toast.success("Platform integration connected");
      setDialogOpen(false);
      await invalidateIntegrations();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      providerKey,
      values,
    }: {
      providerKey: string;
      values: IntegrationManageFormValues;
    }) =>
      updatePlatformIntegration(providerKey, integrationFormToPayload(values)),
    onSuccess: async () => {
      toast.success("Platform integration updated");
      setDialogOpen(false);
      await invalidateIntegrations();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (providerKey: string) =>
      confirmDisconnectPlatformIntegration(providerKey),
    onSuccess: async () => {
      toast.success("Platform integration removed");
      setDeleteOpen(false);
      setDialogOpen(false);
      setSelectedProvider(null);
      await invalidateIntegrations();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openConnect = (provider: IntegrationProviderWithStatus) => {
    setSelectedProvider(provider);
    setDialogMode("connect");
    setDialogOpen(true);
  };

  const openManage = (provider: IntegrationProviderWithStatus) => {
    setSelectedProvider(provider);
    setDialogMode("manage");
    setDialogOpen(true);
  };

  const handlePrimaryAction = (provider: IntegrationProviderWithStatus) => {
    if (provider.status === "NOT_CONNECTED" || provider.status === "EXPIRED") {
      openConnect(provider);
      return;
    }
    if (provider.status === "DISABLED") {
      openManage(provider);
      return;
    }
    openManage(provider);
  };

  const handleDialogSubmit = (values: IntegrationManageFormValues) => {
    if (!selectedProvider) return;
    if (dialogMode === "connect") {
      connectMutation.mutate({ providerKey: selectedProvider.key, values });
      return;
    }
    updateMutation.mutate({ providerKey: selectedProvider.key, values });
  };

  const handleDelete = (provider: IntegrationProviderWithStatus) => {
    setSelectedProvider(provider);
    setDeleteOpen(true);
  };

  const isPending =
    connectMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader description="Configure platform-wide providers for AI, messaging, payments, and storage. Meta (WhatsApp, Facebook, Instagram) is configured via backend environment variables." />

      <IntegrationCategoryTabs value={category} onValueChange={setCategory} />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <IntegrationGrid
          providers={filteredProviders}
          canManage={canManage}
          onPrimaryAction={handlePrimaryAction}
          onManage={openManage}
          onDelete={handleDelete}
          onViewDetails={(provider) => {
            setSelectedProvider(provider);
            setDetailsOpen(true);
          }}
          onRefreshStatus={() => {
            toast.message("Status refresh will be available when provider sync is implemented.");
          }}
          emptyMessage="No platform integrations match this filter."
        />
      )}

      <IntegrationManageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        provider={selectedProvider}
        mode={dialogMode}
        isPending={isPending}
        canDelete={canManage}
        showAdvancedDetails={canManage}
        onSubmit={handleDialogSubmit}
        onDelete={() => setDeleteOpen(true)}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete platform integration"
        description={
          <>
            Remove the platform connection to{" "}
            <strong>{selectedProvider?.name}</strong>? Businesses may be affected.
          </>
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (selectedProvider) {
            deleteMutation.mutate(selectedProvider.key);
          }
        }}
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{selectedProvider?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {selectedProvider?.description ?? "No description available."}
            </p>
            {selectedProvider ? (
              <p>
                <span className="text-muted-foreground">Category: </span>
                {INTEGRATION_CATEGORY_LABELS[selectedProvider.category]}
              </p>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
