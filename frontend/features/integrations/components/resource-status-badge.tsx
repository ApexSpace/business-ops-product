"use client";

import { Badge } from "@/components/ui/badge";
import type { IntegrationResourceStatus } from "@/features/integrations/utils/integration-resources";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  IntegrationResourceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ACTIVE: { label: "Active", variant: "default" },
  INACTIVE: { label: "Inactive", variant: "secondary" },
  ERROR: { label: "Error", variant: "destructive" },
};

export interface ResourceStatusBadgeProps {
  status: IntegrationResourceStatus;
  className?: string;
}

export function ResourceStatusBadge({
  status,
  className,
}: ResourceStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
