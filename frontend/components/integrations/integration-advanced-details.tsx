"use client";

import { ChevronDown } from "lucide-react";
import { MetaAppReviewNotes } from "@/components/integrations/meta-app-review-notes";
import { MetaWebhookStatus } from "@/components/integrations/meta-webhook-status";
import {
  formatIntegrationDate,
  isMetaBusinessProvider,
  type BusinessIntegration,
  type IntegrationProviderWithStatus,
} from "@/lib/integrations";
import { cn } from "@/lib/utils";

export interface IntegrationAdvancedDetailsProps {
  provider: IntegrationProviderWithStatus;
  integrationDetail?: BusinessIntegration | null;
  oauthScopes?: string[];
  className?: string;
}

function OAuthScopesList({ scopes }: { scopes: string[] }) {
  if (scopes.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Granted scopes</p>
      <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
        {scopes.map((scope) => (
          <li key={scope} className="truncate font-mono">
            {scope}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntegrationAdvancedDetails({
  provider,
  integrationDetail,
  oauthScopes = [],
  className,
}: IntegrationAdvancedDetailsProps) {
  const integration = provider.integration;
  const webhookStatus =
    typeof integrationDetail?.config?.webhookStatus === "string"
      ? String(integrationDetail.config.webhookStatus)
      : null;

  const hasScopes = oauthScopes.length > 0;
  const hasWebhook = !!webhookStatus;
  const hasMetaNotes = isMetaBusinessProvider(provider.key);
  const hasTechnicalContent =
    hasScopes ||
    hasWebhook ||
    hasMetaNotes ||
    !!integration?.lastSyncAt ||
    !!integration?.errorMessage ||
    !!integrationDetail?.config;

  if (!hasTechnicalContent) return null;

  return (
    <details
      className={cn(
        "group rounded-lg border border-border/60 bg-muted/10",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <span>Advanced details</span>
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
        <div className="space-y-1">
          <p>
            <span className="font-medium text-foreground/80">Provider key: </span>
            <span className="font-mono">{provider.key}</span>
          </p>
          {integrationDetail?.id ? (
            <p>
              <span className="font-medium text-foreground/80">
                Integration ID:{" "}
              </span>
              <span className="font-mono">{integrationDetail.id}</span>
            </p>
          ) : null}
        </div>

        {integration?.lastSyncAt ? (
          <p>
            <span className="font-medium text-foreground/80">Last sync: </span>
            {formatIntegrationDate(integration.lastSyncAt)}
          </p>
        ) : null}

        {integration?.connectedAt ? (
          <p>
            <span className="font-medium text-foreground/80">Connected at: </span>
            {formatIntegrationDate(integration.connectedAt)}
          </p>
        ) : null}

        {integration?.errorMessage ? (
          <p className="text-destructive">{integration.errorMessage}</p>
        ) : null}

        <OAuthScopesList scopes={oauthScopes} />

        {hasWebhook ? (
          <MetaWebhookStatus webhookStatus={webhookStatus} />
        ) : null}

        {hasMetaNotes ? (
          <MetaAppReviewNotes providerKey={provider.key} />
        ) : null}

        {integrationDetail?.config &&
        Object.keys(integrationDetail.config).length > 0 ? (
          <div className="space-y-1.5">
            <p className="font-medium text-foreground/80">Configuration</p>
            <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[11px]">
              {JSON.stringify(integrationDetail.config, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}
