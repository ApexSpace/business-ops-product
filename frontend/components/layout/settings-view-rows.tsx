"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SettingsViewRow = {
  label: string;
  value: ReactNode;
};

export function SettingsViewRows({
  rows,
  className,
}: {
  rows: SettingsViewRow[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-[var(--spacing-3)]",
        className,
      )}
    >
      {rows.map((row) => (
        <div key={row.label} className="min-w-0 space-y-[var(--spacing-1)]">
          <p className="text-sm text-muted-foreground">{row.label}</p>
          <div className="text-sm font-semibold text-foreground">
            {row.value === null ||
            row.value === undefined ||
            row.value === "" ? (
              <span className="font-normal text-muted-foreground">Not set</span>
            ) : (
              row.value
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
