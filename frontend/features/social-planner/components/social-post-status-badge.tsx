import { Badge } from "@/components/ui/badge";
import type { SocialPostStatus } from "@/features/social-planner/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<SocialPostStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  PUBLISHING:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  PUBLISHED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  PARTIAL:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  CANCELLED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
};

export function SocialPostStatusBadge({
  status,
  className,
}: {
  status: SocialPostStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status], className)}>
      {status.toLowerCase()}
    </Badge>
  );
}
