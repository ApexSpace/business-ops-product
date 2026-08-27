"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListPrimaryActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** Show Plus icon (default true) */
  showIcon?: boolean;
}

/**
 * Universal list primary CTA — Figma “New Checkout” position/style.
 * Place via ListToolbar `actions` (renders on the left).
 * Uses Button `variant="brand"` size default (`--control-height`, `--control-padding-x`).
 */
export function ListPrimaryAction({
  label,
  onClick,
  disabled,
  className,
  showIcon = true,
}: ListPrimaryActionProps) {
  return (
    <>
      <Button
        type="button"
        variant="brand"
        size="icon"
        disabled={disabled}
        className={cn("sm:hidden", className)}
        onClick={onClick}
        aria-label={label}
      >
        <Plus className="size-5" strokeWidth={2.5} />
      </Button>
      <Button
        type="button"
        variant="brand"
        disabled={disabled}
        className={cn("hidden sm:inline-flex", className)}
        onClick={onClick}
      >
        {label}
      </Button>
    </>
  );
}
