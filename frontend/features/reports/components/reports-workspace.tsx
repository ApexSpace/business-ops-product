"use client";

import { useMemo, useState } from "react";
import { FileBarChart } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { ReportCatalogSidebar } from "@/features/reports/components/report-catalog-sidebar";
import { ReportConfigPanel } from "@/features/reports/components/report-config-panel";
import { useReportsCatalog } from "@/features/reports/hooks/use-reports-catalog";

export function ReportsWorkspace() {
  const { groups, data, isLoading, isError, error, refetch } =
    useReportsCatalog();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const reports = useMemo(() => data ?? [], [data]);

  // Derive a valid selection without syncing via effect (catalog can change).
  const activeKey = useMemo(() => {
    if (!selectedKey) return null;
    return reports.some((report) => report.key === selectedKey)
      ? selectedKey
      : null;
  }, [reports, selectedKey]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.key === activeKey) ?? null,
    [reports, activeKey],
  );

  if (isError) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
        <ApiErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <ReportCatalogSidebar
        groups={groups}
        selectedKey={activeKey}
        onSelect={setSelectedKey}
        isLoading={isLoading}
      />
      {selectedReport ? (
        <ReportConfigPanel key={selectedReport.key} report={selectedReport} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <FileBarChart className="size-12 opacity-40" />
          <p className="text-sm">Select a report from the list</p>
        </div>
      )}
    </div>
  );
}
