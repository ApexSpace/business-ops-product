"use client";

import { Badge } from "@/components/ui/badge";
import type { IntegrationStatus } from "@/lib/integrations";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  IntegrationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  NOT_CONNECTED: { label: "Not connected", variant: "outline" },
  CONNECTED: { label: "Connected", variant: "default" },
  ERROR: { label: "Error", variant: "destructive" },
  DISABLED: { label: "Disabled", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "destructive" },
};

export interface IntegrationStatusBadgeProps {
  status: IntegrationStatus;
  className?: string;
}

export function IntegrationStatusBadge({
  status,
  className,
}: IntegrationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
