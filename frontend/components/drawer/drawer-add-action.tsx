"use client";

import { DrawerPlusIcon } from "@/components/drawer/drawer-icons";
import {
  DRAWER_ADD_ACTION_CLASS,
  DRAWER_ADD_ACTION_ICON_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerAddActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function DrawerAddAction({
  label,
  onClick,
  disabled,
  className,
}: DrawerAddActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        DRAWER_ADD_ACTION_CLASS,
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      onClick={onClick}
    >
      <span className={DRAWER_ADD_ACTION_ICON_CLASS}>
        <DrawerPlusIcon className="size-4 text-white" />
      </span>
      {label}
    </button>
  );
}
