"use client";

import { Button } from "@/components/ui/button";
import { DRAWER_PRIMARY_BUTTON_CLASS } from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerPrimaryButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}

/**
 * Full-width brand primary for drawer/dialog footers.
 * Uses Button `variant="brand"` + `--control-height`.
 */
export function DrawerPrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
  className,
}: DrawerPrimaryButtonProps) {
  return (
    <Button
      type={type}
      variant="brand"
      className={cn(DRAWER_PRIMARY_BUTTON_CLASS, className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
