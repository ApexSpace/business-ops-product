"use client";

import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResourceStatusBadge } from "@/features/integrations/components/resource-status-badge";
import type { IntegrationResource } from "@/features/integrations/utils/integration-resources";

export interface IntegrationResourceCardProps {
  resource: IntegrationResource;
  canManage?: boolean;
  isPending?: boolean;
  onSelect?: (resourceId: string) => void;
  onUnselect?: (resourceId: string) => void;
  onMakeDefault?: (resourceId: string) => void;
}

export function IntegrationResourceCard({
  resource,
  canManage = false,
  isPending = false,
  onSelect,
  onUnselect,
  onMakeDefault,
}: IntegrationResourceCardProps) {
  const isStripeAccount = resource.type === "STRIPE_ACCOUNT";
  const stripeMeta = isStripeAccount ? resource.metadata : null;
  const readinessLabel =
    typeof stripeMeta?.readinessLabel === "string"
      ? stripeMeta.readinessLabel
      : null;
  const modeLabel =
    typeof stripeMeta?.modeLabel === "string" ? stripeMeta.modeLabel : null;
  const defaultCurrency =
    typeof stripeMeta?.defaultCurrency === "string"
      ? stripeMeta.defaultCurrency.toUpperCase()
      : null;
  const country =
    typeof stripeMeta?.country === "string" ? stripeMeta.country : null;

  const handleToggleSelected = (checked: boolean) => {
    if (checked) {
      onSelect?.(resource.id);
    } else {
      onUnselect?.(resource.id);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{resource.name}</p>
          {resource.isDefault ? (
            <Badge variant="secondary" className="gap-1">
              <Star className="size-3 fill-current" />
              Default
            </Badge>
          ) : null}
          {resource.isSelected && !resource.isDefault ? (
            <Badge variant="outline">Selected</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ResourceStatusBadge status={resource.status} />
        </div>
        {isStripeAccount ? (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {readinessLabel ? <li>{readinessLabel}</li> : null}
            {modeLabel ? <li>{modeLabel}</li> : null}
            {defaultCurrency ? <li>Currency: {defaultCurrency}</li> : null}
            {country ? <li>Country: {country}</li> : null}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canManage && !isStripeAccount ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={resource.isSelected}
              disabled={isPending}
              onCheckedChange={(checked) =>
                handleToggleSelected(checked === true)
              }
            />
            Use this account
          </label>
        ) : null}

        {canManage && !isStripeAccount && !resource.isDefault ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onMakeDefault?.(resource.id)}
          >
            Set as default
          </Button>
        ) : null}
      </div>
    </div>
  );
}
