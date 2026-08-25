"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared drawer body order for checkout, sales, and appointment side-drawers:
 * line items → inline add/edit surface → "+ Add" action triggers.
 * Keeps action buttons directly above the sticky footer.
 */
export function DrawerItemAddLayout({
  items,
  editor,
  actions,
  className,
}: {
  items?: ReactNode;
  editor?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6", className)}>
      {items}
      {editor}
      {actions}
    </div>
  );
}
