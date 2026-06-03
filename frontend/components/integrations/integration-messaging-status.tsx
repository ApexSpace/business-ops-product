"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getMessagingStatus } from "@/lib/conversations";
import { queryKeys } from "@/lib/query-keys";

interface IntegrationMessagingStatusProps {
  providerKey: string;
  isConnected: boolean;
}

export function IntegrationMessagingStatus({
  providerKey,
  isConnected,
}: IntegrationMessagingStatusProps) {
  const enabled =
    isConnected && (providerKey === "facebook" || providerKey === "instagram");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.integrations.messagingStatus(providerKey),
    queryFn: () => getMessagingStatus(providerKey),
    enabled,
  });

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking messaging status…
      </div>
    );
  }

  if (!data) return null;

  const statusLabel = data.readyForMessaging
    ? "Ready"
    : data.defaultResourceSelected
      ? "Setup incomplete"
      : data.connected
        ? "Page not selected"
        : "Not connected";

  const StatusIcon = data.readyForMessaging ? CheckCircle2 : AlertCircle;

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Messaging status</p>
        <Badge variant={data.readyForMessaging ? "default" : "secondary"}>
          <StatusIcon className="mr-1 size-3" />
          {statusLabel}
        </Badge>
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>
          {data.connected ? "✓" : "○"} Integration connected
        </li>
        <li>
          {data.defaultResourceSelected ? "✓" : "○"} Default{" "}
          {providerKey === "facebook" ? "Page" : "account"} selected
        </li>
        <li>
          {data.webhookEndpointConfigured ? "✓" : "○"} Webhook verify token
          configured on server
        </li>
        <li>
          {data.requiredPermissionsPresent ? "✓" : "○"} Messaging permissions
        </li>
      </ul>
      {data.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-400">
          {data.warnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
