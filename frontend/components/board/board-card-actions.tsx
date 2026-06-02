"use client";

import { cn } from "@/lib/utils";

export interface BoardCardActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function BoardCardActions({ children, className }: BoardCardActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 border-t border-border/60 pt-2",
        className,
      )}
      data-no-dnd
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
