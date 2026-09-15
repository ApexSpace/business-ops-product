"use client";

import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExportReport } from "@/features/reports/hooks/use-export-report";
import type {
  ReportExportFormat,
  ReportFilterValues,
} from "@/features/reports/types";

type ReportExportButtonsProps = {
  reportKey: string;
  filters: ReportFilterValues;
  formats?: ReportExportFormat[];
};

export function ReportExportButtons({
  reportKey,
  filters,
  formats = ["pdf", "xlsx"],
}: ReportExportButtonsProps) {
  const exportMutation = useExportReport();
  const pendingFormat =
    exportMutation.isPending &&
    (exportMutation.variables?.format as ReportExportFormat | undefined);
  const showPdf = formats.includes("pdf");
  const showExcel = formats.includes("xlsx");

  function handleExport(format: ReportExportFormat) {
    exportMutation.mutate({ reportKey, format, filters });
  }

  return (
    <div className="flex items-center gap-2">
      {showPdf ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("pdf")}
          disabled={exportMutation.isPending}
        >
          {pendingFormat === "pdf" ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <FileDown className="mr-1.5 size-4" />
          )}
          Download PDF
        </Button>
      ) : null}
      {showExcel ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("xlsx")}
          disabled={exportMutation.isPending}
        >
          {pendingFormat === "xlsx" ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-1.5 size-4" />
          )}
          Download Excel
        </Button>
      ) : null}
    </div>
  );
}
