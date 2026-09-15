import type { ImplementationStatus } from "@/features/automations/types/metadata";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<ImplementationStatus, string> = {
  implemented: "Active",
  planned: "Coming soon",
  stub: "Planned",
};

const STATUS_VARIANT: Record<
  ImplementationStatus,
  "default" | "secondary" | "outline"
> = {
  implemented: "default",
  planned: "secondary",
  stub: "outline",
};

export function ImplementationStatusBadge({
  status,
}: {
  status: ImplementationStatus;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="shrink-0">
      {STATUS_LABEL[status]}
    </Badge>
  );
}
