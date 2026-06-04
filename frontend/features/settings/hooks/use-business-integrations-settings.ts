"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  integrationFormToPayload,
  type IntegrationManageFormValues,
} from "@/features/integrations/components/integration-manage-dialog";
import {
  formatOAuthErrorMessage,
  formatOAuthWarningMessage,
  getOAuthStartUrl,
  hasOAuthStartRoute,
  filterIntegrationProvidersByCategory,
  OAUTH_ROUTE_NOT_CONFIGURED_MESSAGE,
  shouldUseManualConnect,
  shouldUseOAuthPopup,
  usesWhatsAppEmbeddedSignup,
  type IntegrationCategory,
  type IntegrationProviderWithStatus,
} from "@/features/integrations/utils/integrations";
import {
  completeWhatsAppEmbeddedSignupOnServer,
  launchWhatsAppEmbeddedSignup,
} from "@/features/integrations/utils/whatsapp-embedded-signup";
import {
  OAUTH_MESSAGE_TYPE,
  openOAuthPopup,
  subscribeToOAuthMessages,
  watchOAuthPopupClosed,
} from "@/features/integrations/utils/oauth-popup";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import {
  connectBusinessIntegration,
  confirmDisconnectBusinessIntegration,
  getBusinessIntegration,
  listBusinessIntegrationProviders,
  updateBusinessIntegration,
} from "@/features/integrations/api/integrations.api";

export function useBusinessIntegrationsSettings() {
  const queryClient = useQueryClient();
  const canManage = useCan(PERMISSIONS["settings.business"]);

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
    queryFn: () => listBusinessIntegrationProviders(),
  });

  providersRef.current = providers;

  const { data: integrationDetail } = useQuery({
    queryKey: queryKeys.integrations.businessDetail(
      selectedProvider?.key ?? "",
    ),
    queryFn: () => getBusinessIntegration(selectedProvider!.key),
    enabled:
      dialogOpen &&
      dialogMode === "manage" &&
      !!selectedProvider &&
      shouldUseOAuthPopup(selectedProvider),
  });

  const filteredProviders = useMemo(
    () => filterIntegrationProvidersByCategory(providers, category),
    [providers, category],
  );

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
        if (message.warning) {
          const warningText = formatOAuthWarningMessage(message.warning);
          if (warningText) {
            toast.warning(warningText);
          }
        }
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
      connectBusinessIntegration(providerKey, integrationFormToPayload(values)),
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
      updateBusinessIntegration(providerKey, integrationFormToPayload(values)),
    onSuccess: async () => {
      toast.success("Integration updated");
      setDialogOpen(false);
      await invalidateIntegrations();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (providerKey: string) =>
      confirmDisconnectBusinessIntegration(providerKey),
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

    if (!hasOAuthStartRoute(provider.key)) {
      toast.error(OAUTH_ROUTE_NOT_CONFIGURED_MESSAGE);
      return;
    }

    oauthCompletedRef.current = false;
    setConnectingProviderKey(provider.key);

    let url: string;
    try {
      url = getOAuthStartUrl(provider.key);
    } catch (error) {
      setConnectingProviderKey(null);
      toast.error(
        error instanceof Error
          ? formatOAuthErrorMessage(error.message)
          : OAUTH_ROUTE_NOT_CONFIGURED_MESSAGE,
      );
      return;
    }

    const { blocked, popup } = openOAuthPopup(url);

    if (blocked) {
      setConnectingProviderKey(null);
      setBlockedOAuthUrl(url);
      setPopupBlockedOpen(true);
      toast.error(formatOAuthErrorMessage("popup_blocked"));
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

  return {
    canManage,
    category,
    setCategory,
    selectedProvider,
    setSelectedProvider,
    dialogMode,
    dialogOpen,
    setDialogOpen,
    deleteOpen,
    setDeleteOpen,
    detailsOpen,
    setDetailsOpen,
    popupBlockedOpen,
    setPopupBlockedOpen,
    blockedOAuthUrl,
    connectingProviderKey,
    isLoading,
    filteredProviders,
    integrationDetail,
    isPending,
    handlePrimaryAction,
    openManage,
    handleDelete,
    handleDialogSubmit,
    startWhatsAppEmbeddedSignup,
    startOAuthConnect,
    deleteMutation,
  };
}
