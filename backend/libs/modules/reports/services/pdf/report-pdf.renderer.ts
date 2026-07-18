import { Injectable } from '@nestjs/common';
import type { ReportDocument } from '../../contracts/report-document';
import { ReportPdfLayout } from './report-pdf-layout';

@Injectable()
export class ReportPdfRenderer {
  private readonly layout = new ReportPdfLayout();

  async render(document: ReportDocument): Promise<Buffer> {
    return this.layout.render(document);
  }
}
