export type ReportCellAlign = "left" | "right" | "center";

export type ReportCellFormat =
  | "text"
  | "int"
  | "money"
  | "percent"
  | "date";

export type ReportColumn = {
  key: string;
  label: string;
  align?: ReportCellAlign;
  format?: ReportCellFormat;
  excelOnly?: boolean;
};

export type ReportRow = {
  id: string;
  cells: Record<string, string | number | null>;
  depth?: number;
  isTotal?: boolean;
  isGroup?: boolean;
};

export type ReportSection = {
  id: string;
  title?: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  pageBreakBefore?: boolean;
  pageBreakHeader?: "report" | "none";
};

export type ReportDocumentMeta = {
  reportKey: string;
  title: string;
  description?: string;
  businessName: string;
  periodLabel: string;
  generatedAt: string;
  currency: string;
  footnotes: string[];
};

export type ReportDocument = {
  meta: ReportDocumentMeta;
  sections: ReportSection[];
};

export type ReportFilterFieldType =
  | "date_range"
  | "single_date"
  | "staff_multi"
  | "staff_toggle"
  | "group_by"
  | "sort_by"
  | "select"
  | "boolean"
  | "entity_select";

export type ReportFilterOption = {
  value: string;
  label: string;
};

export type ReportDateRangeMode = "full" | "months";

export type ReportFilterField = {
  key: string;
  label: string;
  type: ReportFilterFieldType;
  options?: ReportFilterOption[];
  visibleWhen?: { key: string; equals: string | boolean };
  defaultValue?: string | boolean | string[] | null;
  /** `months` = past-year month presets + custom (Client Retention). */
  dateRangeMode?: ReportDateRangeMode;
};

export type ReportCatalogItem = {
  key: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  filters: ReportFilterField[];
  footnotes: string[];
  exportFormats?: ReportExportFormat[];
};

export type ReportCategoryGroup = {
  category: string;
  categoryLabel: string;
  reports: ReportCatalogItem[];
};

/** Rolling presets, `custom`, or named months as `month:YYYY-MM`. */
export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "last_6_months"
  | "custom"
  | `month:${string}`;

/** Runtime filter values keyed by filter field key. */
export type ReportFilterValues = Record<
  string,
  string | boolean | string[] | null | undefined
>;

export type ReportExportFormat = "pdf" | "xlsx";

