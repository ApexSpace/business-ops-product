import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type {
  ReportExportFormat,
  ReportFilters,
} from '../contracts/report-document';
import { ReportExcelRenderer } from './excel/report-excel.renderer';
import { ReportPdfRenderer } from './pdf/report-pdf.renderer';
import { ReportQueryService } from './report-query.service';

export type ReportExportFile = {
  format: ReportExportFormat;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

@Injectable()
export class ReportExportService {
  constructor(
    private readonly reportQuery: ReportQueryService,
    private readonly pdfRenderer: ReportPdfRenderer,
    private readonly excelRenderer: ReportExcelRenderer,
  ) {}

  /**
   * Render a report to PDF/Excel bytes for direct download.
   * Does not persist the file to object storage.
   */
  async renderExport(params: {
    businessId: string;
    reportKey: string;
    format: ReportExportFormat;
    filters: ReportFilters;
  }): Promise<ReportExportFile> {
    const def = this.reportQuery.requireDefinition(params.reportKey);
    await this.reportQuery.assertReportAllowed(params.businessId, def);

    const allowedFormats = def.exportFormats ?? ['pdf', 'xlsx'];
    if (!allowedFormats.includes(params.format)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Export format "${params.format}" is not available for this report`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const document = await this.reportQuery.generate(
      params.businessId,
      params.reportKey,
      params.filters,
    );

    const buffer =
      params.format === 'pdf'
        ? await this.pdfRenderer.render(document)
        : await this.excelRenderer.render(document);

    const fileName = this.buildFileName(
      params.reportKey,
      params.format,
      document.meta.periodLabel,
    );
    const mimeType =
      params.format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return {
      format: params.format,
      fileName,
      mimeType,
      buffer,
    };
  }

  private buildFileName(
    reportKey: string,
    format: ReportExportFormat,
    periodLabel: string,
  ): string {
    const safePeriod = periodLabel.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    return `${reportKey}_${safePeriod}.${ext}`;
  }
}
