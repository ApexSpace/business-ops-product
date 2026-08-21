"use client";

import { DrawerPlusIcon } from "@/components/drawer/drawer-icons";
import {
  APPOINTMENT_DRAWER_ADD_ACTION_CLASS,
  APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerAddActionProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function DrawerAddAction({ label, onClick, className }: DrawerAddActionProps) {
  return (
    <button
      type="button"
      className={cn(APPOINTMENT_DRAWER_ADD_ACTION_CLASS, className)}
      onClick={onClick}
    >
      <span className={APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS}>
        <DrawerPlusIcon className="size-4 text-white" />
      </span>
      {label}
    </button>
  );
}
