"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  APPOINTMENT_DRAWER_CHECKBOX_CLASS,
  APPOINTMENT_DRAWER_CHECKBOX_LABEL_CLASS,
  APPOINTMENT_DRAWER_CHECKBOX_ROW_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerCheckboxRowProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function DrawerCheckboxRow({
  id,
  label,
  checked,
  onCheckedChange,
  className,
}: DrawerCheckboxRowProps) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_CHECKBOX_ROW_CLASS, className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className={APPOINTMENT_DRAWER_CHECKBOX_CLASS}
      />
      <Label htmlFor={id} className={APPOINTMENT_DRAWER_CHECKBOX_LABEL_CLASS}>
        {label}
      </Label>
    </div>
  );
}
