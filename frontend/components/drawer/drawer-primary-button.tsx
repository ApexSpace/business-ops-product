"use client";

import { ActionButton } from "@/components/ui/action-button";
import { APPOINTMENT_DRAWER_PRIMARY_BUTTON_CLASS } from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerPrimaryButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}

export function DrawerPrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
  className,
}: DrawerPrimaryButtonProps) {
  return (
    <ActionButton
      type={type}
      className={cn(APPOINTMENT_DRAWER_PRIMARY_BUTTON_CLASS, className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </ActionButton>
  );
}
