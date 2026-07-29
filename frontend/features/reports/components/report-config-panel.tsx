"use client";

import { useMemo, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { ReportPreview } from "@/features/reports/components/report-preview";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { useGenerateReport } from "@/features/reports/hooks/use-generate-report";
import type {
  ReportCatalogItem,
  ReportFilterValues,
} from "@/features/reports/types";
import { defaultRetentionMonthPreset } from "@/features/reports/utils/report-date-range-options";

function buildDefaultValues(report: ReportCatalogItem): ReportFilterValues {
  const values: ReportFilterValues = {};
  const today = new Date().toISOString().slice(0, 10);
  for (const field of report.filters) {
    if (field.type === "date_range" && field.dateRangeMode === "months") {
      values[field.key] =
        typeof field.defaultValue === "string"
          ? field.defaultValue
          : defaultRetentionMonthPreset();
    } else if (field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue;
    } else if (field.type === "date_range") {
      values[field.key] = "today";
    } else if (field.type === "single_date") {
      values[field.key] = today;
    }
  }
  return values;
}

export function ReportConfigPanel({ report }: { report: ReportCatalogItem }) {
  const [values, setValues] = useState<ReportFilterValues>(() =>
    buildDefaultValues(report),
  );
  const generateMutation = useGenerateReport();
  const document = generateMutation.data;

  const appliedFilters = useMemo(() => values, [values]);

  function handleChange(key: string, value: ReportFilterValues[string]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleGenerate() {
    const preset =
      typeof values.dateRange === "string" ? values.dateRange : "today";
    const from =
      typeof values.fromDate === "string" ? values.fromDate : "";
    const to = typeof values.toDate === "string" ? values.toDate : "";
    if (preset === "custom" && from && to && from > to) {
      return;
    }
    generateMutation.mutate({ reportKey: report.key, filters: values });
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold text-foreground">
            {report.title}
          </h1>
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </div>
        {document ? (
          <ReportExportButtons
            reportKey={report.key}
            filters={appliedFilters}
            formats={report.exportFormats ?? ["pdf", "xlsx"]}
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-80 shrink-0 space-y-4 overflow-y-auto border-r border-border px-5 py-5">
          {report.filters.length > 0 ? (
            <ReportFilters
              fields={report.filters}
              values={values}
              onChange={handleChange}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              This report has no configurable filters.
            </p>
          )}
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {generateMutation.isPending ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Generating report…
            </div>
          ) : document ? (
            <ReportPreview document={document} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <BarChart3 className="size-10 opacity-40" />
              <p className="text-sm">
                Configure filters and select{" "}
                <span className="font-medium text-foreground">Generate</span> to
                preview this report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
