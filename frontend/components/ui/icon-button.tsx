"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "size"> {
  "aria-label": string;
  size?: "icon-sm" | "icon";
}

export function IconButton({
  className,
  variant = "ghost",
  size = "icon-sm",
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    >
      {children}
    </Button>
  );
}
