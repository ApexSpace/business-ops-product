"use client";

import { ActionButton } from "@/components/ui/action-button";
import { APPOINTMENT_DRAWER_PRIMARY_BUTTON_CLASS } from "@/features/appointments/styles/appointment-drawer-tokens";
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
    <div className={cn("w-full space-y-[15px]", className)}>
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
      <ActionButton
        type="button"
        className={cn(APPOINTMENT_DRAWER_PRIMARY_BUTTON_CLASS, className)}
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </ActionButton>
    </div>
  );
}
