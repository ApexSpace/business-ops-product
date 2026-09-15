"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import {
  DRAWER_FIELD_GROUP_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

/** Field group — label + control, gap `--drawer-field-gap`. */
export function DrawerFormFieldGroup({
  label,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(DRAWER_FIELD_GROUP_CLASS, className)}>
      {label ? (
        <Label htmlFor={htmlFor} className={DRAWER_FIELD_LABEL_CLASS}>
          {label}
        </Label>
      ) : null}
      {children}
    </div>
  );
}
