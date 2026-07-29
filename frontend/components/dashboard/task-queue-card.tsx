import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import type { DashboardTaskItem } from "@/features/dashboard/types";

function assignedLabel(item: DashboardTaskItem): string | null {
  return (
    item.assignedTo?.displayName ??
    [item.assignedTo?.firstName, item.assignedTo?.lastName]
      .filter(Boolean)
      .join(" ") ??
    null
  );
}

interface TaskQueueCardProps {
  title: string;
  items: DashboardTaskItem[];
  emptyMessage: string;
  bulletClassName?: string;
}

export function TaskQueueCard({
  title,
  items,
  emptyMessage,
  bulletClassName = "bg-primary",
}: TaskQueueCardProps) {
  return (
    <DashboardCardShell title={title} contentClassName="px-4 pb-4 pt-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 py-0.5">
              <span className={`size-2 shrink-0 rounded-full ${bulletClassName}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] text-[#12172b] dark:text-foreground">
                  {assignedLabel(item)
                    ? `${assignedLabel(item)} — ${item.title}`
                    : item.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCardShell>
  );
}
