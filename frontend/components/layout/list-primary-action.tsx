"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DATA_TABLE_PRIMARY_ACTION_CLASS } from "@/lib/design/data-table-tokens";

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
        size="icon"
        disabled={disabled}
        className={cn(
          DATA_TABLE_PRIMARY_ACTION_CLASS,
          "!size-11 px-0 sm:hidden",
          className,
        )}
        onClick={onClick}
        aria-label={label}
      >
        <Plus className="size-5" strokeWidth={2.5} />
      </Button>
      <Button
        type="button"
        disabled={disabled}
        className={cn(
          DATA_TABLE_PRIMARY_ACTION_CLASS,
          "hidden sm:inline-flex",
          className,
        )}
        onClick={onClick}
      >
        {showIcon ? <Plus className="size-4" strokeWidth={2.5} /> : null}
        {label}
      </Button>
    </>
  );
}
