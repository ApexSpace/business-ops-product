"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DRAWER_CHECKBOX_CLASS,
  DRAWER_CHECKBOX_LABEL_CLASS,
  DRAWER_CHECKBOX_ROW_CLASS,
} from "@/lib/design/drawer-tokens";
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
    <div className={cn(DRAWER_CHECKBOX_ROW_CLASS, className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className={DRAWER_CHECKBOX_CLASS}
      />
      <Label htmlFor={id} className={DRAWER_CHECKBOX_LABEL_CLASS}>
        {label}
      </Label>
    </div>
  );
}
