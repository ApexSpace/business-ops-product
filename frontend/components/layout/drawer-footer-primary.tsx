"use client";

import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { cn } from "@/lib/utils";

export interface DrawerFooterPrimaryActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  summaryLabel?: string;
  summaryValue?: string;
  className?: string;
}

export function DrawerFooterPrimaryAction({
  label,
  onClick,
  disabled = false,
  summaryLabel,
  summaryValue,
  className,
}: DrawerFooterPrimaryActionProps) {
  return (
    <div className={cn("w-full space-y-drawer-footer", className)}>
      {summaryLabel && summaryValue ? (
        <div className="flex items-center justify-between px-1">
          <span className="text-[13px] font-medium text-muted-foreground">
            {summaryLabel}
          </span>
          <span className="text-[16px] font-semibold tabular-nums text-foreground">
            {summaryValue}
          </span>
        </div>
      ) : null}
      <DrawerPrimaryButton
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={className}
      >
        {label}
      </DrawerPrimaryButton>
    </div>
  );
}
