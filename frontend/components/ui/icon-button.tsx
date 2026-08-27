"use client";

import { Button } from "@/components/ui/button";
import { DRAWER_HEADER_ACTION_CLASS } from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "size"> {
  "aria-label": string;
  /**
   * `header` — drawer/sheet header actions; same box as close (X).
   * `icon` / `icon-sm` — toolbar and inline controls.
   */
  size?: "icon-sm" | "icon" | "header";
}

export function IconButton({
  className,
  variant = "ghost",
  size = "icon",
  children,
  ...props
}: IconButtonProps) {
  const isHeader = size === "header";

  return (
    <Button
      type="button"
      variant={variant}
      size={isHeader ? "icon-sm" : size}
      className={cn(
        "cursor-pointer rounded-md hover:bg-violet-primary-normal/10 hover:text-violet-primary-normal",
        isHeader && DRAWER_HEADER_ACTION_CLASS,
        className,
      )}
      {...props}
      data-icon-button=""
    >
      {children}
    </Button>
  );
}
