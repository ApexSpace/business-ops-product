import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import { cn } from "@/lib/utils";

export interface DashboardBreakdownItem {
  id: string;
  label: string;
  value: string;
  meta?: string;
  progress?: number;
  accentClassName?: string;
}

interface DashboardBreakdownCardProps {
  title: string;
  items: DashboardBreakdownItem[];
  actionLabel?: string;
  actionHref?: string;
  variant?: "bars" | "list";
}

export function DashboardBreakdownCard({
  title,
  items,
  actionLabel,
  actionHref,
  variant = "list",
}: DashboardBreakdownCardProps) {
  return (
    <DashboardCardShell
      title={title}
      actionLabel={actionLabel}
      actionHref={actionHref}
      contentClassName="px-4 pb-4 pt-3"
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available yet.</p>
      ) : variant === "bars" ? (
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
          <div className="flex h-[84px] items-end gap-2 pt-1">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "w-3 rounded-[4px] bg-primary",
                  item.accentClassName,
                  index === 1 && !item.accentClassName && "bg-rose-500",
                  index === 2 && !item.accentClassName && "bg-amber-500",
                  index === 3 && !item.accentClassName && "bg-emerald-500",
                )}
                style={{
                  height: `${Math.max(12, Math.min(100, item.progress ?? 0))}%`,
                }}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-[11.5px] text-[#12172b] dark:text-foreground"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full bg-primary",
                    item.accentClassName,
                    index === 1 && !item.accentClassName && "bg-rose-500",
                    index === 2 && !item.accentClassName && "bg-amber-500",
                    index === 3 && !item.accentClassName && "bg-emerald-500",
                  )}
                />
                <span className="truncate">{item.label}</span>
                <span className="ml-auto shrink-0 text-[#98a1b5]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 text-[12px]"
            >
              <span className="truncate text-[#12172b] dark:text-foreground">
                {item.label}
              </span>
              <div className="shrink-0 text-right">
                <span className="font-medium text-[#12172b] dark:text-foreground">
                  {item.value}
                </span>
                {item.meta ? (
                  <span
                    className={cn(
                      "ml-1 text-[10.5px]",
                      item.meta.startsWith("↑")
                        ? "text-[#1f9d63]"
                        : item.meta.startsWith("↓")
                          ? "text-[#dc3545]"
                          : "text-[#98a1b5]",
                    )}
                  >
                    {item.meta}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCardShell>
  );
}
