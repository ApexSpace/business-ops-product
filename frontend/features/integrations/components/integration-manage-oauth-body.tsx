"use client";

import { IntegrationAdvancedDetails } from "@/features/integrations/components/integration-advanced-details";
import { IntegrationMessagingStatus } from "@/features/integrations/components/integration-messaging-status";
import { IntegrationManageHeader } from "@/features/integrations/components/integration-manage-header";
import { IntegrationResourcesPanel } from "@/features/integrations/components/integration-resources-panel";
import type { BusinessIntegration } from "@/features/integrations/utils/integrations";
import type { IntegrationProviderWithStatus } from "@/features/integrations/utils/integrations";
import { providerSupportsResources } from "@/features/integrations/utils/integration-resources";

export interface IntegrationManageOAuthBodyProps {
  provider: IntegrationProviderWithStatus;
  integrationDetail?: BusinessIntegration | null;
  isConnected: boolean;
  canDelete: boolean;
  showAdvancedDetails: boolean;
  oauthScopes: string[];
  onReconnect?: () => void;
}

export function IntegrationManageOAuthBody({
  provider,
  integrationDetail,
  isConnected,
  canDelete,
  showAdvancedDetails,
  oauthScopes,
  onReconnect,
}: IntegrationManageOAuthBodyProps) {
  const supportsResources = providerSupportsResources(provider.key);

  return (
    <div className="space-y-6">
      <IntegrationManageHeader provider={provider} />

      {(provider.key === "facebook" ||
        provider.key === "instagram" ||
        provider.key === "whatsapp") && (
        <IntegrationMessagingStatus
          providerKey={provider.key}
          isConnected={isConnected}
        />
      )}

      {supportsResources && isConnected ? (
        <IntegrationResourcesPanel
          providerKey={provider.key}
          isConnected={isConnected}
          canManage={canDelete}
          onReconnect={onReconnect}
        />
      ) : provider.key === "linkedin" && isConnected ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
          Your LinkedIn account is connected. Additional organization features
          will appear here when they are available.
        </div>
      ) : null}

      {showAdvancedDetails ? (
        <IntegrationAdvancedDetails
          provider={provider}
          integrationDetail={integrationDetail}
          oauthScopes={oauthScopes}
        />
      ) : null}
    </div>
  );
}
