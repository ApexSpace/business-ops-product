"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DrawerSettingsIcon } from "@/components/drawer/drawer-icons";
import {
  DRAWER_EXPRESS_LABEL_CLASS,
  DRAWER_EXPRESS_ROW_CLASS,
  DRAWER_SETTINGS_ICON_BUTTON_CLASS,
  DRAWER_SWITCH_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerExpressRowProps {
  id: string;
  label?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  settings?: ReactNode;
  className?: string;
}

export function DrawerExpressRow({
  id,
  label = "Use Express Booking",
  checked,
  onCheckedChange,
  settings,
  className,
}: DrawerExpressRowProps) {
  return (
    <div className={cn(DRAWER_EXPRESS_ROW_CLASS, className)}>
      <Label htmlFor={id} className={DRAWER_EXPRESS_LABEL_CLASS}>
        {label}
      </Label>
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className={DRAWER_SWITCH_CLASS}
        />
        {settings ?? (
          <span className={DRAWER_SETTINGS_ICON_BUTTON_CLASS}>
            <DrawerSettingsIcon className="size-6" />
          </span>
        )}
      </div>
    </div>
  );
}
