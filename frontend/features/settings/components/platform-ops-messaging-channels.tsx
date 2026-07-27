"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  connectOpsEmail,
  connectOpsSms,
  getPlatformMetaClientConfig,
  listOpsMessagingChannels,
  type OpsMessagingChannel,
} from "@/features/integrations/api/integrations.api";
import {
  formatOAuthErrorMessage,
  getIntegrationConnectLabel,
} from "@/features/integrations/utils/integrations";
import {
  completePlatformWhatsAppEmbeddedSignupOnServer,
  launchWhatsAppEmbeddedSignup,
} from "@/features/integrations/utils/whatsapp-embedded-signup";
import {
  OAUTH_MESSAGE_TYPE,
  openOAuthPopup,
  subscribeToOAuthPopupMessages,
  watchOAuthPopupClosed,
} from "@/features/integrations/utils/oauth-popup";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";

const CHANNEL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

function statusBadge(channel: OpsMessagingChannel) {
  if (channel.messagingStatus.readyForMessaging) {
    return <Badge variant="success">Ready</Badge>;
  }
  if (channel.integration?.status === "CONNECTED") {
    return <Badge variant="secondary">Connected</Badge>;
  }
  return <Badge variant="outline">Not connected</Badge>;
}

export function PlatformOpsMessagingChannels() {
  const queryClient = useQueryClient();
  const canManage = useCan(PERMISSIONS["platform.settings.manage"]);
  const [connectingKey, setConnectingKey] = useState<string | null>(null);
  const oauthCompletedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.integrations.opsMessaging(),
    queryFn: () => listOpsMessagingChannels(),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.integrations.opsMessaging(),
    });
  };

  useEffect(() => {
    return subscribeToOAuthPopupMessages((message) => {
      if (message.type === OAUTH_MESSAGE_TYPE.SUCCESS) {
        oauthCompletedRef.current = true;
        setConnectingKey(null);
        toast.success(
          `${CHANNEL_LABELS[message.providerKey ?? ""] ?? "Channel"} connected`,
        );
        void invalidate();
        return;
      }
      if (message.type === OAUTH_MESSAGE_TYPE.ERROR) {
        oauthCompletedRef.current = true;
        setConnectingKey(null);
        toast.error(formatOAuthErrorMessage(message.message));
      }
    });
  }, [queryClient]);

  const smsMutation = useMutation({
    mutationFn: () => connectOpsSms(),
    onSuccess: async () => {
      toast.success("Ops SMS connected");
      setConnectingKey(null);
      await invalidate();
    },
    onError: (error: Error) => {
      setConnectingKey(null);
      toast.error(error.message);
    },
  });

  const emailMutation = useMutation({
    mutationFn: () => connectOpsEmail(),
    onSuccess: async () => {
      toast.success("Ops email connected");
      setConnectingKey(null);
      await invalidate();
    },
    onError: (error: Error) => {
      setConnectingKey(null);
      toast.error(error.message);
    },
  });

  const startMetaOAuth = (providerKey: "facebook" | "instagram") => {
    if (connectingKey) return;
    oauthCompletedRef.current = false;
    setConnectingKey(providerKey);
    const url = `/api/oauth/meta/platform/start?providerKey=${providerKey}`;
    const { blocked, popup } = openOAuthPopup(url);
    if (blocked) {
      setConnectingKey(null);
      toast.error(formatOAuthErrorMessage("popup_blocked"));
      return;
    }
    if (popup) {
      watchOAuthPopupClosed(popup, () => {
        setConnectingKey((current) => {
          if (current === providerKey && !oauthCompletedRef.current) {
            toast.error("Connection was cancelled or did not complete.");
          }
          oauthCompletedRef.current = false;
          return current === providerKey ? null : current;
        });
      });
    }
  };

  const startWhatsApp = async () => {
    if (connectingKey) return;
    setConnectingKey("whatsapp");
    try {
      const config = await getPlatformMetaClientConfig();
      const result = await launchWhatsAppEmbeddedSignup(config);
      await completePlatformWhatsAppEmbeddedSignupOnServer(result);
      toast.success("WhatsApp connected for ops inbox");
      await invalidate();
    } catch (error) {
      toast.error(
        formatOAuthErrorMessage(
          error instanceof Error ? error.message : "WhatsApp signup failed",
        ),
      );
    } finally {
      setConnectingKey(null);
    }
  };

  const handleConnect = (channel: OpsMessagingChannel) => {
    if (!canManage) return;
    switch (channel.providerKey) {
      case "facebook":
      case "instagram":
        startMetaOAuth(channel.providerKey);
        return;
      case "whatsapp":
        void startWhatsApp();
        return;
      case "sms":
        setConnectingKey("sms");
        smsMutation.mutate();
        return;
      case "email":
        setConnectingKey("email");
        emailMutation.mutate();
        return;
      default:
        toast.error("Unsupported channel");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Ops messaging channels</h2>
        <p className="text-sm text-muted-foreground">
          Connect Instagram, Facebook, WhatsApp, SMS, and email to the internal
          ops workspace for the platform Unified Inbox. These use the same
          channel graph as businesses, scoped to CodeSol Ops only.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {(data?.channels ?? []).map((channel) => {
            const label =
              CHANNEL_LABELS[channel.providerKey] ?? channel.providerKey;
            const ready = channel.messagingStatus.readyForMessaging;
            const connecting = connectingKey === channel.providerKey;
            return (
              <li
                key={channel.providerKey}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{label}</span>
                    {statusBadge(channel)}
                  </div>
                  {channel.messagingStatus.warnings[0] ? (
                    <p className="text-xs text-muted-foreground">
                      {channel.messagingStatus.warnings[0]}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant={ready ? "outline" : "default"}
                  disabled={!canManage || connecting || ready}
                  onClick={() => handleConnect(channel)}
                >
                  {connecting
                    ? "Connecting…"
                    : ready
                      ? "Connected"
                      : getIntegrationConnectLabel(
                          {
                            key: channel.providerKey,
                            name: label,
                            connectionType:
                              channel.providerKey === "whatsapp"
                                ? "EMBEDDED_SIGNUP"
                                : channel.providerKey === "facebook" ||
                                    channel.providerKey === "instagram"
                                  ? "OAUTH"
                                  : "MANUAL",
                          },
                          channel.integration?.status ?? "NOT_CONNECTED",
                        )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
