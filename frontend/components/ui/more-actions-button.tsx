"use client";

import { MoreActionsIcon } from "@/components/ui/more-actions-icon";
import { IconButton, type IconButtonProps } from "@/components/ui/icon-button";

export type MoreActionsButtonProps = Omit<IconButtonProps, "children">;

/**
 * Global three-dots trigger. Default `size="header"` matches drawer close (X)
 * hover padding. Do not wrap lucide ellipsis icons ad hoc.
 */
export function MoreActionsButton({
  size = "header",
  "aria-label": ariaLabel = "More actions",
  ...props
}: MoreActionsButtonProps) {
  return (
    <IconButton size={size} aria-label={ariaLabel} {...props}>
      <MoreActionsIcon />
    </IconButton>
  );
}
