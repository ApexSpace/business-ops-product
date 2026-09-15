"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { REPORT_NO_DATA_MESSAGE } from "@/features/reports/constants";
import type {
  ReportColumn,
  ReportDocument,
  ReportRow,
} from "@/features/reports/types";

function isNumericColumn(column: ReportColumn): boolean {
  return (
    column.format === "money" ||
    column.format === "int" ||
    column.format === "percent"
  );
}

function formatCell(
  value: string | number | null,
  column: ReportColumn,
  currency: string,
  isTotal = false,
): string {
  if (value === "") {
    return "";
  }

  if (value === null || value === undefined) {
    if (isTotal && !isNumericColumn(column)) {
      return "";
    }
    return "";
  }

  switch (column.format) {
    case "money": {
      const num = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(num)) return String(value);
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currency || "USD",
        }).format(num);
      } catch {
        return num.toFixed(2);
      }
    }
    case "percent": {
      const num = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(num)) return String(value);
      return `${num.toFixed(1)}%`;
    }
    case "int": {
      const num = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(num)) return String(value);
      return new Intl.NumberFormat().format(Math.round(num));
    }
    default:
      return String(value);
  }
}

function alignClass(align: ReportColumn["align"]): string {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function ReportSectionTable({
  section,
  currency,
}: {
  section: ReportDocument["sections"][number];
  currency: string;
}) {
  const columns = useMemo(
    () => section.columns.filter((column) => !column.excelOnly),
    [section.columns],
  );

  return (
    <div className="space-y-2">
      {section.title || section.subtitle ? (
        <div className="space-y-0.5">
          {section.title ? (
            <h3 className="text-sm font-semibold text-foreground">
              {section.title}
            </h3>
          ) : null}
          {section.subtitle ? (
            <p className="text-xs text-muted-foreground">{section.subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    alignClass(column.align),
                    "whitespace-pre-line leading-tight",
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(columns.length, 1)}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {REPORT_NO_DATA_MESSAGE}
                </TableCell>
              </TableRow>
            ) : (
              section.rows.map((row: ReportRow) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.isTotal && "bg-muted/40 font-semibold",
                    row.isGroup && "bg-muted/20 font-medium italic",
                  )}
                >
                  {columns.map((column, index) => {
                    const indent =
                      index === 0 && row.depth ? row.depth * 16 : 0;
                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          alignClass(column.align),
                          column.format === "money" ||
                            column.format === "int" ||
                            column.format === "percent"
                            ? "tabular-nums"
                            : undefined,
                        )}
                        style={indent ? { paddingLeft: indent + 16 } : undefined}
                      >
                        {formatCell(
                          row.cells[column.key],
                          column,
                          currency,
                          row.isTotal,
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReportPreview({ document }: { document: ReportDocument }) {
  const { meta, sections } = document;
  const [firstSection, ...restSections] = sections;

  if (sections.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">{meta.title}</h2>
          <p className="text-sm text-muted-foreground">
            {meta.businessName} · {meta.periodLabel}
          </p>
          {meta.description ? (
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
          {REPORT_NO_DATA_MESSAGE}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{meta.title}</h2>
        <p className="text-sm text-muted-foreground">
          {meta.businessName} · {meta.periodLabel}
        </p>
        {meta.description ? (
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        ) : null}
      </div>

      <div className="space-y-8">
        {firstSection ? (
          <div className="space-y-3">
            <ReportSectionTable
              section={firstSection}
              currency={meta.currency}
            />
            {meta.footnotes.length > 0 ? (
              <div className="space-y-1">
                {meta.footnotes.map((footnote, index) => (
                  <p key={index} className="text-xs text-muted-foreground">
                    * {footnote}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {restSections.map((section) => (
          <ReportSectionTable
            key={section.id}
            section={section}
            currency={meta.currency}
          />
        ))}
      </div>
    </div>
  );
}
