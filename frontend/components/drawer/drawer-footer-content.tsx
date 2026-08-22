"use client";

import type { ReactNode } from "react";
import { DRAWER_FOOTER_INNER_CLASS } from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

/** Figma Footer inner stack — vertical · fill width · gap 15px. */
export function DrawerFooterContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(DRAWER_FOOTER_INNER_CLASS, className)}>
      {children}
    </div>
  );
}
