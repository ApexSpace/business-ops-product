import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import type { ReportDataProvider } from './contracts/report-provider.interface';
import { ReportsController } from './controllers/reports.controller';
import { ALL_REPORT_PROVIDERS } from './providers';
import { ReportExcelRenderer } from './services/excel/report-excel.renderer';
import { ReportPdfRenderer } from './services/pdf/report-pdf.renderer';
import { ReportExportService } from './services/report-export.service';
import { ReportQueryService } from './services/report-query.service';
import { GenerateReportProcessor } from './workers/processors/generate-report.processor';

@Module({
  imports: [BusinessModule],
  controllers: [ReportsController],
  providers: [
    ReportQueryService,
    ReportExportService,
    ReportPdfRenderer,
    ReportExcelRenderer,
    GenerateReportProcessor,
    ...ALL_REPORT_PROVIDERS,
  ],
  exports: [
    ReportQueryService,
    ReportExportService,
    GenerateReportProcessor,
  ],
})
export class ReportsModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly reportQuery: ReportQueryService,
  ) {}

  onModuleInit(): void {
    for (const ProviderClass of ALL_REPORT_PROVIDERS) {
      const provider = this.moduleRef.get(ProviderClass, { strict: false });
      if (provider) {
        this.reportQuery.registerProvider(provider as ReportDataProvider);
      }
    }
  }
}
