"use client";

import { IntegrationResourceCard } from "@/components/integrations/integration-resource-card";
import type { IntegrationResource } from "@/lib/integration-resources";

export interface IntegrationResourceListProps {
  resources: IntegrationResource[];
  canManage?: boolean;
  isPending?: boolean;
  onSelect?: (resourceId: string) => void;
  onUnselect?: (resourceId: string) => void;
  onMakeDefault?: (resourceId: string) => void;
  emptyMessage?: string;
}

export function IntegrationResourceList({
  resources,
  canManage = false,
  isPending = false,
  onSelect,
  onUnselect,
  onMakeDefault,
  emptyMessage = "No resources found. Sync to fetch available resources from your connected account.",
}: IntegrationResourceListProps) {
  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => (
        <IntegrationResourceCard
          key={resource.id}
          resource={resource}
          canManage={canManage}
          isPending={isPending}
          onSelect={onSelect}
          onUnselect={onUnselect}
          onMakeDefault={onMakeDefault}
        />
      ))}
    </div>
  );
}
