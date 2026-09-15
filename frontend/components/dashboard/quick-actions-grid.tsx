import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";

export interface QuickActionItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface QuickActionsGridProps {
  actions: QuickActionItem[];
  title?: string;
  className?: string;
}

export function QuickActionsGrid({
  actions,
  title = "Quick actions",
  className,
}: QuickActionsGridProps) {
  return (
    <DashboardCardShell
      title={title}
      className={className}
      contentClassName="p-2"
    >
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className="glass-hover flex min-h-24 flex-col items-start gap-3 rounded-[1.15rem] border border-[color:var(--glass-border)] bg-white/38 p-4 transition-colors hover:bg-white/58 dark:bg-white/5 dark:hover:bg-white/8"
            >
              <div className="flex size-9 items-center justify-center rounded-2xl bg-white/75 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-white/8">
                <Icon className="size-4" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </DashboardCardShell>
  );
}
