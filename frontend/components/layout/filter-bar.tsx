"use client";

import { cn } from "@/lib/utils";

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-2 overflow-x-auto sm:gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
