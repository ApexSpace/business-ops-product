import type {
  ReportDefinition,
  ReportDocument,
  ReportFilters,
} from '../contracts/report-document';

export const REPORT_DATA_PROVIDER = Symbol('REPORT_DATA_PROVIDER');

export interface ReportDataProvider {
  readonly key: string;
  generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument>;
}

export type ReportGenerateContext = {
  businessName: string;
  currency: string;
  timezone: string;
  generatedAt: Date;
};

export type ResolvedReportDefinition = ReportDefinition & {
  providerRegistered: boolean;
};
