"use client";

import { IntegrationCard } from "@/features/integrations/components/integration-card";
import type { IntegrationProviderWithStatus } from "@/features/integrations/utils/integrations";
import { cn } from "@/lib/utils";

export interface IntegrationGridProps {
  providers: IntegrationProviderWithStatus[];
  canManage?: boolean;
  connectingProviderKey?: string | null;
  onPrimaryAction: (provider: IntegrationProviderWithStatus) => void;
  onManage: (provider: IntegrationProviderWithStatus) => void;
  onDelete: (provider: IntegrationProviderWithStatus) => void;
  onViewDetails: (provider: IntegrationProviderWithStatus) => void;
  onRefreshStatus?: (provider: IntegrationProviderWithStatus) => void;
  className?: string;
  emptyMessage?: string;
}

export function IntegrationGrid({
  providers,
  canManage,
  connectingProviderKey = null,
  onPrimaryAction,
  onManage,
  onDelete,
  onViewDetails,
  onRefreshStatus,
  className,
  emptyMessage = "No integrations match this filter.",
}: IntegrationGridProps) {
  if (providers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {providers.map((provider) => (
        <div key={provider.key} className="h-full">
          <IntegrationCard
            provider={provider}
            canManage={canManage}
            isConnecting={connectingProviderKey === provider.key}
            onPrimaryAction={onPrimaryAction}
            onManage={onManage}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
            onRefreshStatus={onRefreshStatus}
          />
        </div>
      ))}
    </div>
  );
}
