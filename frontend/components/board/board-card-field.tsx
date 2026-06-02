"use client";

import { cn } from "@/lib/utils";

export interface BoardCardFieldProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function BoardCardField({ label, value, className }: BoardCardFieldProps) {
  if (value == null || value === "" || value === "—") return null;

  return (
    <div className={cn("grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5 text-xs", className)}>
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
    </div>
  );
}
