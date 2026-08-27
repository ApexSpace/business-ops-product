import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MoreActionsIconProps {
  className?: string;
}

/**
 * Canonical overflow glyph — horizontal ellipsis (⋯).
 * Use this instead of lucide `MoreVertical` / `MoreHorizontal`.
 */
export function MoreActionsIcon({ className }: MoreActionsIconProps) {
  return (
    <MoreHorizontal
      className={cn("size-4 shrink-0", className)}
      strokeWidth={2}
      aria-hidden
    />
  );
}
