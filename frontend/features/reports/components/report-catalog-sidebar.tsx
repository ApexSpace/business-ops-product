"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReportCategoryGroup } from "@/features/reports/types";

type ReportCatalogSidebarProps = {
  groups: ReportCategoryGroup[];
  selectedKey: string | null;
  onSelect: (reportKey: string) => void;
  isLoading: boolean;
};

export function ReportCatalogSidebar({
  groups,
  selectedKey,
  onSelect,
  isLoading,
}: ReportCatalogSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-border">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Reports</h2>
        <p className="text-xs text-muted-foreground">
          Generate and export business reports
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {isLoading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            No reports available.
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.category} className="space-y-1">
                <h3 className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.categoryLabel}
                </h3>
                <ul className="space-y-0.5">
                  {group.reports.map((report) => {
                    const active = report.key === selectedKey;
                    return (
                      <li key={report.key}>
                        <button
                          type="button"
                          onClick={() => onSelect(report.key)}
                          className={cn(
                            "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                            active
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-foreground hover:bg-accent",
                          )}
                        >
                          {report.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
