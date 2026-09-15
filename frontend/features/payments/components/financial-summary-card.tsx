import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinancialSummaryTone =
  | "neutral"
  | "amber"
  | "green"
  | "red"
  | "blue"
  | "brand";

const TONE_STYLES: Record<
  FinancialSummaryTone,
  { icon: string; link: string }
> = {
  neutral: {
    icon: "bg-muted text-muted-foreground",
    link: "text-primary",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    link: "text-primary",
  },
  green: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    link: "text-primary",
  },
  red: {
    icon: "bg-destructive/10 text-destructive",
    link: "text-primary",
  },
  blue: {
    icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    link: "text-primary",
  },
  brand: {
    icon: "bg-primary/10 text-primary",
    link: "text-primary",
  },
};

export interface FinancialSummaryCardProps {
  label: string;
  count: number;
  amount: string;
  icon?: LucideIcon;
  tone?: FinancialSummaryTone;
  viewLabel?: string;
  onClick?: () => void;
  className?: string;
}

export function FinancialSummaryCard({
  label,
  count,
  amount,
  icon: Icon,
  tone = "neutral",
  viewLabel,
  onClick,
  className,
}: FinancialSummaryCardProps) {
  const toneStyle = TONE_STYLES[tone];
  const itemLabel = count === 1 ? "item" : "items";
  const interactive = Boolean(onClick);

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {label}
        </span>
        {Icon ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-[9px]",
              toneStyle.icon,
            )}
            aria-hidden
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xs text-muted-foreground">
          {count} {itemLabel}
        </p>
        <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
          {amount}
        </p>
      </div>
      {viewLabel ? (
        <span
          className={cn(
            "mt-2.5 inline-flex items-center gap-1 text-xs font-semibold",
            toneStyle.link,
          )}
        >
          {viewLabel}
          <ArrowRight className="size-3" aria-hidden />
        </span>
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-full min-h-[7.5rem] w-full flex-col rounded-xl border border-border bg-card p-4 text-left shadow-elevation-xs transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-elevation-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-[7.5rem] flex-col rounded-xl border border-border bg-card p-4 shadow-elevation-xs",
        className,
      )}
    >
      {content}
    </div>
  );
}
