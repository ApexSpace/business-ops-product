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
  isPlatformEmailProvider,
  isPlatformSmsProvider,
  shouldUseManualConnect,
  shouldUseOAuthPopup,
  usesWhatsAppEmbeddedSignup,
  type IntegrationCategory,
  type IntegrationProviderWithStatus,
  type InstagramAuthFlowParam,
} from "@/features/integrations/utils/integrations";
import {
  completeWhatsAppEmbeddedSignupOnServer,
  launchWhatsAppEmbeddedSignup,
} from "@/features/integrations/utils/whatsapp-embedded-signup";
import {
  OAUTH_MESSAGE_TYPE,
  openOAuthPopup,
  settleOAuthPopupClose,
  subscribeToOAuthMessages,
  watchOAuthPopupClosed,
} from "@/features/integrations/utils/oauth-popup";
import {
  oauthConnectingToastMessage,
  oauthSyncOutcomeToastMessage,
  waitForOAuthResourceSync,
} from "@/features/integrations/utils/oauth-sync-outcome";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";
import { queryKeys } from "@/lib/query/keys";
import { useAuth } from "@/lib/auth/provider";
import {
  connectBusinessIntegration,
  connectPlatformDefaultEmail,
  confirmDisconnectBusinessIntegration,
  getBusinessIntegration,
  listBusinessIntegrationProviders,
  updateBusinessIntegration,
} from "@/features/integrations/api/integrations.api";

export function useBusinessIntegrationsSettings() {
  const queryClient = useQueryClient();
  const { user, jwt } = useAuth();
  const role = user?.businessRole ?? jwt?.businessRole;
  const staffPermissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const canManage = hasStaffPermission(
    staffPermissions,
    "settings.integrations.manage",
    role,
  );

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
  const [syncingAssetsProviderKey, setSyncingAssetsProviderKey] = useState<
    string | null
  >(null);
  const [instagramChooserOpen, setInstagramChooserOpen] = useState(false);
  const [instagramChooserProvider, setInstagramChooserProvider] =
    useState<IntegrationProviderWithStatus | null>(null);

  const providersRef = useRef<IntegrationProviderWithStatus[]>([]);
  const oauthCompletedRef = useRef(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: queryKeys.integrations.businessProviders(),
    queryFn: () => listBusinessIntegrationProviders(),
  });

  providersRef.current = providers;

  useEffect(() => {
    if (!selectedProvider) return;
    const latest = providers.find((item) => item.key === selectedProvider.key);
    if (latest && latest !== selectedProvider) {
      setSelectedProvider(latest);
    }
  }, [providers, selectedProvider]);

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

  const invalidateIntegrations = async (providerKey?: string) => {
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
      ...(providerKey
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.integrations.businessResources(providerKey),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.integrations.messagingStatus(providerKey),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.integrations.businessDetail(providerKey),
            }),
          ]
        : []),
    ]);
  };

  useEffect(() => {
    return subscribeToOAuthMessages((message) => {
      setConnectingProviderKey(null);

      if (message.type === OAUTH_MESSAGE_TYPE.SUCCESS) {
        oauthCompletedRef.current = true;
        const providerKey = message.providerKey;

        toast.message(oauthConnectingToastMessage(providerKey));
        setSyncingAssetsProviderKey(providerKey);

        void (async () => {
          try {
            const { resourceCount } = await waitForOAuthResourceSync({
              providerKey,
              jobId: message.jobId,
              host: "business",
            });
            const outcome = oauthSyncOutcomeToastMessage(
              providerKey,
              resourceCount,
            );
            if (outcome.type === "success") {
              toast.success(outcome.message);
            } else {
              toast.warning(outcome.message);
            }
            if (message.warning) {
              const warningText = formatOAuthWarningMessage(message.warning);
              if (warningText) {
                toast.warning(warningText);
              }
            }
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Connected, but resource sync did not finish. Open Manage to sync again.",
            );
          } finally {
            setSyncingAssetsProviderKey((current) =>
              current === providerKey ? null : current,
            );
            await invalidateIntegrations(providerKey);
          }
        })();
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.whatsappSettings.overview(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.whatsappSettings.numbers(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "WhatsApp signup failed";
      toast.error(formatOAuthErrorMessage(message));
    } finally {
      setConnectingProviderKey(null);
    }
  };

  const platformEmailMutation = useMutation({
    mutationFn: () => connectPlatformDefaultEmail(),
    onSuccess: async () => {
      toast.success("Email activated for your business");
      setDialogOpen(false);
      await invalidateIntegrations();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.platformEmail(),
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.whatsappSettings.overview(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.whatsappSettings.numbers(),
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startOAuthConnect = (
    provider: IntegrationProviderWithStatus,
    options?: { authFlow?: InstagramAuthFlowParam },
  ) => {
    if (
      connectingProviderKey &&
      connectingProviderKey !== provider.key
    ) {
      return;
    }

    if (!hasOAuthStartRoute(provider.key)) {
      toast.error(OAUTH_ROUTE_NOT_CONFIGURED_MESSAGE);
      return;
    }

    oauthCompletedRef.current = false;
    setDialogOpen(false);
    setConnectingProviderKey(provider.key);

    let url: string;
    try {
      url = getOAuthStartUrl(provider.key, {
        authFlow: options?.authFlow,
      });
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

    if (blocked || !popup) {
      setConnectingProviderKey(null);
      if (blocked) {
        setBlockedOAuthUrl(url);
        setPopupBlockedOpen(true);
        toast.error(formatOAuthErrorMessage("popup_blocked"));
      } else {
        toast.error("Could not open the authorization window. Please try again.");
      }
      return;
    }

    watchOAuthPopupClosed(popup, async () => {
      // Clear the "Opening…" button immediately — settle can take up to ~2 minutes
      // for Meta COOP false closes, which left Google error/cancel looking stuck.
      setConnectingProviderKey((current) =>
        current === provider.key ? null : current,
      );

      // Meta COOP often marks the popup closed while Facebook login continues.
      const outcome = await settleOAuthPopupClose({
        providerKey: provider.key,
        isCompleted: () => oauthCompletedRef.current,
        checkConnected: async () => {
          const latest = await queryClient.fetchQuery({
            queryKey: queryKeys.integrations.businessProviders(),
            queryFn: () => listBusinessIntegrationProviders(),
          });
          return latest.some(
            (item) =>
              item.key === provider.key &&
              (item.status === "CONNECTED" ||
                item.status === "ERROR" ||
                item.status === "EXPIRED"),
          );
        },
      });

      if (outcome === "cancelled" && !oauthCompletedRef.current) {
        const hint =
          provider.key === "instagram"
            ? options?.authFlow === "instagram_login"
              ? "Instagram connection was cancelled or did not complete. Use a Business or Creator account and try again."
              : "Instagram connection was cancelled or did not complete. Ensure your professional account is linked to a Facebook Page and try again."
            : provider.key === "google-business-profile"
              ? "Google Business Profile connection was cancelled or did not complete. Try again with an account that manages the profile."
              : "Connection was cancelled or did not complete. Please try again.";
        toast.error(hint);
      }
      oauthCompletedRef.current = false;
    });
  };

  const openInstagramChooser = (provider: IntegrationProviderWithStatus) => {
    setDialogOpen(false);
    setInstagramChooserProvider(provider);
    setInstagramChooserOpen(true);
  };

  const openConnect = (provider: IntegrationProviderWithStatus) => {
    if (isPlatformEmailProvider(provider.key)) {
      if (
        provider.status === "NOT_CONNECTED" ||
        provider.status === "EXPIRED" ||
        provider.status === "ERROR"
      ) {
        platformEmailMutation.mutate();
        return;
      }
      openManage(provider);
      return;
    }
    if (isPlatformSmsProvider(provider.key)) {
      setSelectedProvider(provider);
      setDialogMode(
        provider.status === "NOT_CONNECTED" ? "connect" : "manage",
      );
      setDialogOpen(true);
      return;
    }
    if (usesWhatsAppEmbeddedSignup(provider.key)) {
      if (provider.status === "CONNECTED") {
        openManage(provider);
        return;
      }
      void startWhatsAppEmbeddedSignup(provider);
      return;
    }
    if (provider.key === "instagram" && shouldUseOAuthPopup(provider)) {
      openInstagramChooser(provider);
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
    platformEmailMutation.isPending ||
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
    syncingAssetsProviderKey,
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
    openInstagramChooser,
    instagramChooserOpen,
    setInstagramChooserOpen,
    instagramChooserProvider,
    deleteMutation,
  };
}
