"use client";

import type { ReactNode } from "react";
import { DRAWER_FORM_FIELDS_CLASS } from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

/** Form field stack — section-to-section gap `--drawer-section-gap`. */
export function DrawerFormFields({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(DRAWER_FORM_FIELDS_CLASS, className)}>
      {children}
    </div>
  );
}
