import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FinancialSummaryCardProps {
  label: string;
  count: number;
  amount: string;
  icon?: LucideIcon;
  className?: string;
}

export function FinancialSummaryCard({
  label,
  count,
  amount,
  icon: Icon,
  className,
}: FinancialSummaryCardProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[8.5rem] flex-col rounded-lg border border-border/80 bg-card p-4 shadow-elevation-xs ring-1 ring-border/50",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
        ) : null}
      </div>
      <div className="mt-auto space-y-1 pt-4">
        <p className="text-sm font-medium tabular-nums text-foreground">
          {count} {count === 1 ? "item" : "items"}
        </p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {amount}
        </p>
      </div>
    </div>
  );
}
