"use client";

import { cn } from "@/lib/utils";

/**
 * Fills the shell content slot below the topbar (no negative margins).
 * Parent route uses `isContactWorkspacePath` so shell content has p-0.
 */
export function ContactWorkspaceShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/40",
        className,
      )}
    >
      {children}
    </div>
  );
}
