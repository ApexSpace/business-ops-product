"use client";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface BoardActionIconProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function BoardActionIcon({
  icon,
  label,
  onClick,
  disabled = !onClick,
  className,
}: BoardActionIconProps) {
  return (
    <IconButton
      type="button"
      aria-label={label}
      title={disabled ? `${label} (coming soon)` : label}
      className={cn(
        "size-7 text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-45 hover:text-muted-foreground",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {icon}
    </IconButton>
  );
}
