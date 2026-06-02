"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { IntegrationCategoryTabs } from "@/components/integrations/integration-category-tabs";
import { IntegrationGrid } from "@/components/integrations/integration-grid";
import {
  IntegrationManageDialog,
  integrationFormToPayload,
  type IntegrationManageFormValues,
} from "@/components/integrations/integration-manage-dialog";
import { OAuthPopupBlockedDialog } from "@/components/integrations/oauth-popup-blocked-dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import {
  formatOAuthErrorMessage,
  getOAuthStartUrl,
  INTEGRATION_CATEGORY_LABELS,
  shouldUseManualConnect,
  shouldUseOAuthPopup,
  usesWhatsAppEmbeddedSignup,
  type BusinessIntegration,
  type IntegrationCategory,
  type IntegrationProviderWithStatus,
} from "@/lib/integrations";
import {
  completeWhatsAppEmbeddedSignupOnServer,
  launchWhatsAppEmbeddedSignup,
} from "@/lib/whatsapp-embedded-signup";
import {
  OAUTH_MESSAGE_TYPE,
  openOAuthPopup,
  subscribeToOAuthMessages,
  watchOAuthPopupClosed,
} from "@/lib/oauth-popup";
import { canManageBusinessSettings } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";

export function BusinessIntegrationsSettings() {
  const { jwt, contexts } = useAuth();
  const queryClient = useQueryClient();
  const canManage = canManageBusinessSettings(jwt, contexts);

  const [category, setCategory] = useState<IntegrationCategory | "ALL">("ALL");
  const [selectedProvider, setSelectedProvider] =
    useState<IntegrationProviderWithStatus | null>(null);
  const [dialogMode, setDialogMode] = useState<"connect" | "manage">("connect");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [popupBlockedOpen, setPopupBlockedOpen] = useState(false);
  const [blockedOAuthUrl, setBlockedOAuthUrl] = useState<string | null>(null);
  const [connectingProviderKey, setConnectingProviderKey] = useState<
    string | null
  >(null);

  const providersRef = useRef<IntegrationProviderWithStatus[]>([]);
  const oauthCompletedRef = useRef(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: queryKeys.integrations.businessProviders(),
    queryFn: () =>
      apiClient<IntegrationProviderWithStatus[]>("integrations/providers"),
  });

  providersRef.current = providers;

  const { data: integrationDetail } = useQuery({
    queryKey: queryKeys.integrations.businessDetail(
      selectedProvider?.key ?? "",
    ),
    queryFn: () =>
      apiClient<BusinessIntegration>(
        `integrations/business/${selectedProvider!.key}`,
      ),
    enabled:
      dialogOpen &&
      dialogMode === "manage" &&
      !!selectedProvider &&
      shouldUseOAuthPopup(selectedProvider),
  });

  const filteredProviders = useMemo(() => {
    if (category === "ALL") return providers;
    return providers.filter((provider) => provider.category === category);
  }, [providers, category]);

  const invalidateIntegrations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.businessProviders(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.businessList(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.all(),
      }),
    ]);
  };

  useEffect(() => {
    return subscribeToOAuthMessages((message) => {
      setConnectingProviderKey(null);

      if (message.type === OAUTH_MESSAGE_TYPE.SUCCESS) {
        oauthCompletedRef.current = true;
        const provider = providersRef.current.find(
          (item) => item.key === message.providerKey,
        );
        const label = provider?.name ?? message.providerKey;
        toast.success(`${label} connected successfully`);
        void invalidateIntegrations();
        if (message.providerKey) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.integrations.businessResources(
              message.providerKey,
            ),
          });
        }
        return;
      }

      oauthCompletedRef.current = true;
      toast.error(formatOAuthErrorMessage(message.message));
    });
  }, [queryClient]);

  const startWhatsAppEmbeddedSignup = async (
    provider: IntegrationProviderWithStatus,
  ) => {
    if (connectingProviderKey) return;
    setConnectingProviderKey(provider.key);

    try {
      const result = await launchWhatsAppEmbeddedSignup();
      await completeWhatsAppEmbeddedSignupOnServer(result);
      toast.success("WhatsApp connected successfully");
      await invalidateIntegrations();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.businessResources("whatsapp"),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "WhatsApp signup failed";
      toast.error(formatOAuthErrorMessage(message));
    } finally {
      setConnectingProviderKey(null);
    }
  };

  const connectMutation = useMutation({
    mutationFn: ({
      providerKey,
      values,
    }: {
      providerKey: string;
      values: IntegrationManageFormValues;
    }) =>
      apiClient(`integrations/business/${providerKey}/connect`, {
        method: "POST",
        body: integrationFormToPayload(values),
      }),
    onSuccess: async () => {
      toast.success("Integration connected");
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
      apiClient(`integrations/business/${providerKey}`, {
        method: "PATCH",
        body: integrationFormToPayload(values),
      }),
    onSuccess: async () => {
      toast.success("Integration updated");
      setDialogOpen(false);
      await invalidateIntegrations();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (providerKey: string) =>
      apiClient(`integrations/business/${providerKey}?confirm=true`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      toast.success("Integration removed");
      setDeleteOpen(false);
      setDialogOpen(false);
      setSelectedProvider(null);
      await invalidateIntegrations();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startOAuthConnect = (provider: IntegrationProviderWithStatus) => {
    if (connectingProviderKey) return;

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[integrations] connect click providerKey=${provider.key}`,
      );
    }

    oauthCompletedRef.current = false;
    setConnectingProviderKey(provider.key);
    const url = getOAuthStartUrl(provider.key);
    const { blocked, popup } = openOAuthPopup(url);

    if (blocked) {
      setConnectingProviderKey(null);
      setBlockedOAuthUrl(url);
      setPopupBlockedOpen(true);
      toast.error(
        formatOAuthErrorMessage("popup_blocked"),
      );
      return;
    }

    if (popup) {
      watchOAuthPopupClosed(popup, () => {
        setConnectingProviderKey((current) => {
          if (current === provider.key && !oauthCompletedRef.current) {
            const hint =
              provider.key === "instagram"
                ? "Instagram connection was cancelled or did not complete. Ensure your professional account is linked to a Facebook Page and try again."
                : "Connection was cancelled or did not complete. Please try again.";
            toast.error(hint);
          }
          oauthCompletedRef.current = false;
          return current === provider.key ? null : current;
        });
      });
    }
  };

  const openConnect = (provider: IntegrationProviderWithStatus) => {
    if (usesWhatsAppEmbeddedSignup(provider.key)) {
      void startWhatsAppEmbeddedSignup(provider);
      return;
    }
    if (shouldUseOAuthPopup(provider)) {
      startOAuthConnect(provider);
      return;
    }
    if (shouldUseManualConnect(provider)) {
      setSelectedProvider(provider);
      setDialogMode("connect");
      setDialogOpen(true);
    }
  };

  const openManage = (provider: IntegrationProviderWithStatus) => {
    setSelectedProvider(provider);
    setDialogMode("manage");
    setDialogOpen(true);
  };

  const handlePrimaryAction = (provider: IntegrationProviderWithStatus) => {
    if (
      provider.status === "NOT_CONNECTED" ||
      provider.status === "EXPIRED" ||
      (provider.status === "ERROR" && shouldUseOAuthPopup(provider))
    ) {
      openConnect(provider);
      return;
    }
    openManage(provider);
  };

  const handleDialogSubmit = (values: IntegrationManageFormValues) => {
    if (!selectedProvider || shouldUseOAuthPopup(selectedProvider)) return;
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
      <PageHeader description="Connect messaging, calendar, payments, and other tools for your business." />

      <IntegrationCategoryTabs value={category} onValueChange={setCategory} />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <IntegrationGrid
          providers={filteredProviders}
          canManage={canManage}
          connectingProviderKey={connectingProviderKey}
          onPrimaryAction={handlePrimaryAction}
          onManage={openManage}
          onDelete={handleDelete}
          onViewDetails={(provider) => {
            setSelectedProvider(provider);
            setDetailsOpen(true);
          }}
          onRefreshStatus={() => {
            toast.message(
              "Status refresh will be available when provider sync is implemented.",
            );
          }}
        />
      )}

      <IntegrationManageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        provider={selectedProvider}
        integrationDetail={integrationDetail ?? null}
        mode={dialogMode}
        isPending={isPending}
        canDelete={canManage}
        onSubmit={handleDialogSubmit}
        onDelete={() => setDeleteOpen(true)}
        onReconnect={
          selectedProvider
            ? () => {
                if (usesWhatsAppEmbeddedSignup(selectedProvider.key)) {
                  void startWhatsAppEmbeddedSignup(selectedProvider);
                } else if (shouldUseOAuthPopup(selectedProvider)) {
                  startOAuthConnect(selectedProvider);
                }
              }
            : undefined
        }
      />

      <OAuthPopupBlockedDialog
        open={popupBlockedOpen}
        onOpenChange={setPopupBlockedOpen}
        oauthUrl={blockedOAuthUrl}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete integration"
        description={
          <>
            Remove the connection to{" "}
            <strong>{selectedProvider?.name}</strong>? This cannot be undone.
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
            {selectedProvider?.integration?.connectedAccountEmail ? (
              <p>
                <span className="text-muted-foreground">Account: </span>
                {selectedProvider.integration.connectedAccountEmail}
              </p>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
