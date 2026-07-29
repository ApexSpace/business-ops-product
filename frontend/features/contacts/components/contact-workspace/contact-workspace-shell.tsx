"use client";

import { cn } from "@/lib/utils";

/**
 * Fills the shell content slot below the topbar (no negative margins).
 * Parent route uses `isContactWorkspacePath` for legacy `/business/contacts/[id]` only.
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
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent",
        className,
      )}
    >
      {children}
    </div>
  );
}
