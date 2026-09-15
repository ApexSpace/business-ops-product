"use client";

import { cn } from "@/lib/utils";

interface EntityDetailFooterProps {
  children: React.ReactNode;
  className?: string;
}

/** Inner layout for drawer footer actions. Parent `EntityDetailDrawer` provides the footer shell. */
export function EntityDetailFooter({
  children,
  className,
}: EntityDetailFooterProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-end gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
