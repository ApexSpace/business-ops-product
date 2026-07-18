import type {
  ReportColumn,
  ReportDocument,
  ReportDocumentMeta,
  ReportRow,
  ReportSection,
} from '../contracts/report-document';
import type { ReportGenerateContext } from '../contracts/report-provider.interface';

export function buildReportMeta(params: {
  reportKey: string;
  title: string;
  description?: string;
  periodLabel: string;
  context: ReportGenerateContext;
  footnotes?: string[];
}): ReportDocumentMeta {
  return {
    reportKey: params.reportKey,
    title: params.title,
    description: params.description,
    businessName: params.context.businessName,
    periodLabel: params.periodLabel,
    generatedAt: params.context.generatedAt.toISOString(),
    currency: params.context.currency,
    footnotes: params.footnotes ?? [],
  };
}

export function buildDocument(
  meta: ReportDocumentMeta,
  sections: ReportSection[],
): ReportDocument {
  return { meta, sections };
}

export function section(
  id: string,
  columns: ReportColumn[],
  rows: ReportRow[],
  titleOrOpts?:
    | string
    | {
        title?: string;
        subtitle?: string;
        pageBreakBefore?: boolean;
        pageBreakHeader?: 'report' | 'none';
      },
): ReportSection {
  if (typeof titleOrOpts === 'string' || titleOrOpts === undefined) {
    return { id, title: titleOrOpts, columns, rows };
  }
  return {
    id,
    columns,
    rows,
    title: titleOrOpts.title,
    subtitle: titleOrOpts.subtitle,
    pageBreakBefore: titleOrOpts.pageBreakBefore,
    pageBreakHeader: titleOrOpts.pageBreakHeader,
  };
}

export function row(
  id: string,
  cells: Record<string, string | number | null>,
  opts?: { depth?: number; isTotal?: boolean; isGroup?: boolean },
): ReportRow {
  return { id, cells, ...opts };
}

export function moneyCols(
  extras: ReportColumn[] = [],
): ReportColumn[] {
  return extras;
}
