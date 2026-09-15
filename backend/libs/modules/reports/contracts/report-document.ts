export type ReportCellAlign = 'left' | 'right' | 'center';
export type ReportCellFormat = 'text' | 'int' | 'money' | 'percent' | 'date';

export type ReportColumn = {
  key: string;
  label: string;
  align?: ReportCellAlign;
  format?: ReportCellFormat;
  /** When true, column is included in Excel export only */
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
  /** Secondary line under the title (e.g. period label) */
  subtitle?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  /** When true, PDF starts this section on a new page */
  pageBreakBefore?: boolean;
  /** Header drawn after page break. Default: report title. */
  pageBreakHeader?: 'report' | 'none';
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

export type ReportCategory =
  | 'staff'
  | 'sales'
  | 'refunds'
  | 'offers'
  | 'client_account'
  | 'gift_cards'
  | 'packages'
  | 'memberships'
  | 'payments'
  | 'inventory'
  | 'business'
  | 'codesol';

export type ReportFilterFieldType =
  | 'date_range'
  | 'single_date'
  | 'staff_multi'
  | 'staff_toggle'
  | 'group_by'
  | 'sort_by'
  | 'select'
  | 'boolean'
  | 'entity_select';

export type ReportFilterOption = {
  value: string;
  label: string;
};

export type ReportDateRangeMode = 'full' | 'months';

export type ReportFilterField = {
  key: string;
  label: string;
  type: ReportFilterFieldType;
  options?: ReportFilterOption[];
  /** Show this field only when another filter has a given value */
  visibleWhen?: { key: string; equals: string | boolean };
  defaultValue?: string | boolean | string[] | null;
  /**
   * For `date_range` filters: `full` = rolling presets + months;
   * `months` = named months for the past year + custom only (Client Retention).
   */
  dateRangeMode?: ReportDateRangeMode;
};

export type ReportDefinition = {
  key: string;
  category: ReportCategory;
  title: string;
  description: string;
  /** Capability module that must be enabled (beyond reports itself) */
  requiredModuleKey?: string;
  /** Specific feature key; checked via hasCapability when set */
  requiredCapabilityKey?: string;
  /** Deferred reports are listed in docs only and rejected if called */
  deferred?: boolean;
  deferredReason?: string;
  filters: ReportFilterField[];
  /** Prefer queue when date span days exceeds this (default 31) */
  syncMaxDateSpanDays?: number;
  footnotes?: string[];
  /** Allowed download formats. Defaults to PDF + Excel when omitted. */
  exportFormats?: ReportExportFormat[];
};

export type ReportFilters = Record<string, unknown>;

export type ReportExportFormat = 'pdf' | 'xlsx';
