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
  getPlatformGoogleOAuthStartUrl,
  getPlatformMetaOAuthStartUrl,
  filterIntegrationProvidersByCategory,
  isGoogleOAuthProvider,
  isPlatformEmailProvider,
  isPlatformSmsProvider,
  shouldUseManualConnect,
  shouldUseOAuthPopup,
  usesWhatsAppEmbeddedSignup,
  type IntegrationCategory,
  type IntegrationProviderWithStatus,
  type InstagramAuthFlowParam,
  type PlatformGoogleOAuthProviderKey,
} from "@/features/integrations/utils/integrations";
import {
  completePlatformWhatsAppEmbeddedSignupOnServer,
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
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import {
  confirmDisconnectOpsWorkspaceIntegration,
  confirmDisconnectPlatformIntegration,
  connectOpsEmail,
  connectOpsSms,
  connectPlatformIntegration,
  getOpsWorkspaceIntegration,
  getPlatformMetaClientConfig,
  listOpsWorkspaceProviders,
  updatePlatformIntegration,
} from "@/features/integrations/api/integrations.api";

const OPS_WORKSPACE_MESSAGING_KEYS = new Set([
  "facebook",
  "instagram",
  "whatsapp",
  "sms",
  "email",
]);

function isOpsWorkspaceChannel(providerKey: string) {
  return OPS_WORKSPACE_MESSAGING_KEYS.has(providerKey);
}

/** Providers connected via OAuth onto the INTERNAL ops business. */
function isPlatformOpsOAuthProvider(providerKey: string) {
  return (
    providerKey === "facebook" ||
    providerKey === "instagram" ||
    isGoogleOAuthProvider(providerKey)
  );
}

export function usePlatformIntegrationsSettings() {
  const queryClient = useQueryClient();
  const canManage = useCan(PERMISSIONS["platform.settings.manage"]);

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
    queryKey: queryKeys.integrations.platformProviders(),
    queryFn: () => listOpsWorkspaceProviders(),
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
    queryKey: queryKeys.integrations.platformDetail(
      selectedProvider?.key ?? "",
    ),
    queryFn: () => getOpsWorkspaceIntegration(selectedProvider!.key),
    enabled:
      dialogOpen &&
      dialogMode === "manage" &&
      !!selectedProvider &&
      (isOpsWorkspaceChannel(selectedProvider.key) ||
        isPlatformOpsOAuthProvider(selectedProvider.key)) &&
      shouldUseOAuthPopup(selectedProvider),
  });

  const filteredProviders = useMemo(
    () => filterIntegrationProvidersByCategory(providers, category),
    [providers, category],
  );

  const invalidateIntegrations = async (providerKey?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.platformProviders(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.platformList(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.all(),
      }),
      ...(providerKey
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.integrations.businessResources(
                providerKey,
                "platform",
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.integrations.messagingStatus(
                providerKey,
                "platform",
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.integrations.platformDetail(providerKey),
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
              host: "platform",
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
      const config = await getPlatformMetaClientConfig();
      const result = await launchWhatsAppEmbeddedSignup(config);
      await completePlatformWhatsAppEmbeddedSignupOnServer(result);
      toast.success("WhatsApp connected successfully");
      await invalidateIntegrations();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "WhatsApp signup failed";
      toast.error(formatOAuthErrorMessage(message));
    } finally {
      setConnectingProviderKey(null);
    }
  };

  const opsEmailMutation = useMutation({
    mutationFn: () => connectOpsEmail(),
    onSuccess: async () => {
      toast.success("Email activated for ops inbox");
      setDialogOpen(false);
      await invalidateIntegrations();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const opsSmsMutation = useMutation({
    mutationFn: () => connectOpsSms(),
    onSuccess: async () => {
      toast.success("SMS connected for ops inbox");
      setDialogOpen(false);
      await invalidateIntegrations();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connectPlatformMutation = useMutation({
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

  const updatePlatformMutation = useMutation({
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
      isOpsWorkspaceChannel(providerKey) ||
      isPlatformOpsOAuthProvider(providerKey)
        ? confirmDisconnectOpsWorkspaceIntegration(providerKey)
        : confirmDisconnectPlatformIntegration(providerKey),
    onSuccess: async () => {
      toast.success("Integration removed");
      setDeleteOpen(false);
      setDialogOpen(false);
      setSelectedProvider(null);
      await invalidateIntegrations();
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

    const isMeta =
      provider.key === "facebook" || provider.key === "instagram";
    const isGoogle = isGoogleOAuthProvider(provider.key);

    if (!isMeta && !isGoogle) {
      toast.error("OAuth is not available for this provider on platform.");
      return;
    }

    // Reconnect from Manage: close dialog so popup + toasts are clearer.
    setDialogOpen(false);
    oauthCompletedRef.current = false;
    setConnectingProviderKey(provider.key);

    let url: string;
    try {
      url = isMeta
        ? getPlatformMetaOAuthStartUrl(provider.key as "facebook" | "instagram", options?.authFlow)
        : getPlatformGoogleOAuthStartUrl(
            provider.key as PlatformGoogleOAuthProviderKey,
          );
    } catch (error) {
      setConnectingProviderKey(null);
      toast.error(
        error instanceof Error
          ? formatOAuthErrorMessage(error.message)
          : "OAuth route is not configured for this provider.",
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

      const outcome = await settleOAuthPopupClose({
        providerKey: provider.key,
        isCompleted: () => oauthCompletedRef.current,
        checkConnected: async () => {
          const latest = await queryClient.fetchQuery({
            queryKey: queryKeys.integrations.platformProviders(),
            queryFn: () => listOpsWorkspaceProviders(),
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
        opsEmailMutation.mutate();
        return;
      }
      openManage(provider);
      return;
    }
    if (isPlatformSmsProvider(provider.key)) {
      if (provider.status === "NOT_CONNECTED") {
        opsSmsMutation.mutate();
        return;
      }
      openManage(provider);
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
    // Never open the manual JSON form for OAuth providers (Meta / Google / etc.).
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
    if (isOpsWorkspaceChannel(selectedProvider.key)) return;
    if (dialogMode === "connect") {
      connectPlatformMutation.mutate({
        providerKey: selectedProvider.key,
        values,
      });
      return;
    }
    updatePlatformMutation.mutate({
      providerKey: selectedProvider.key,
      values,
    });
  };

  const handleDelete = (provider: IntegrationProviderWithStatus) => {
    setSelectedProvider(provider);
    setDeleteOpen(true);
  };

  const isPending =
    connectPlatformMutation.isPending ||
    opsEmailMutation.isPending ||
    opsSmsMutation.isPending ||
    updatePlatformMutation.isPending ||
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
