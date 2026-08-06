import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { REPORT_NO_DATA_MESSAGE } from '../../constants/report-empty.constants';
import type {
  ReportColumn,
  ReportDocument,
  ReportRow,
} from '../../contracts/report-document';

/**
 * Renders a ReportDocument to an .xlsx buffer.
 * No data queries — layout only.
 */
@Injectable()
export class ReportExcelRenderer {
  async render(document: ReportDocument): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = document.meta.businessName;
    workbook.created = new Date(document.meta.generatedAt);

    for (let index = 0; index < document.sections.length; index++) {
      const section = document.sections[index]!;
      const sheetName = this.uniqueSheetName(
        section.title ??
          (index === 0 ? document.meta.title : section.id) ??
          document.meta.title,
        index,
      );
      const sheet = workbook.addWorksheet(sheetName);
      const columns = section.columns;

      sheet.addRow([document.meta.businessName]);
      sheet.addRow([document.meta.title]);
      if (section.title) {
        sheet.addRow([section.title]);
      }
      if (section.subtitle) {
        sheet.addRow([section.subtitle]);
      } else {
        sheet.addRow([`Period: ${document.meta.periodLabel}`]);
      }
      sheet.addRow([
        `Generated: ${new Date(document.meta.generatedAt).toISOString()}`,
      ]);
      sheet.addRow([]);

      sheet.addRow(columns.map((c) => c.label.replace(/\n/g, ' ')));
      const headerRow = sheet.lastRow;
      if (headerRow) {
        headerRow.font = { bold: true };
      }

      if (section.rows.length === 0) {
        sheet.addRow([REPORT_NO_DATA_MESSAGE]);
        const emptyRow = sheet.lastRow;
        if (emptyRow) {
          emptyRow.font = { italic: true, color: { argb: 'FF6B7280' } };
        }
      } else {
        for (const row of section.rows) {
          sheet.addRow(columns.map((c) => this.cellValue(row, c)));
          if (row.isTotal || row.isGroup) {
            const excelRow = sheet.lastRow;
            if (excelRow) {
              excelRow.font = {
                bold: true,
                italic: Boolean(row.isGroup && !row.isTotal),
              };
            }
          }
        }
      }

      if (document.meta.footnotes.length > 0 && index === 0) {
        sheet.addRow([]);
        for (const note of document.meta.footnotes) {
          sheet.addRow([`* ${note}`]);
        }
      }

      columns.forEach((col, colIndex) => {
        const column = sheet.getColumn(colIndex + 1);
        const labelLen = col.label.replace(/\n/g, ' ').length;
        column.width = Math.min(40, Math.max(12, labelLen + 4));
        if (col.format === 'money') {
          column.numFmt = '#,##0.00';
        }
      });
    }

    if (workbook.worksheets.length === 0) {
      const sheet = workbook.addWorksheet('Report');
      sheet.addRow([document.meta.title]);
      sheet.addRow([REPORT_NO_DATA_MESSAGE]);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private cellValue(row: ReportRow, column: ReportColumn): string | number {
    const value = row.cells[column.key];
    if (value == null) return '';
    if (column.format === 'money' || column.format === 'int' || column.format === 'percent') {
      return typeof value === 'number' ? value : Number(value) || 0;
    }
    return String(value);
  }

  private uniqueSheetName(name: string, index: number): string {
    const base = this.safeSheetName(name);
    if (index === 0) return base;
    const suffix = ` ${index + 1}`;
    return this.safeSheetName(`${base.slice(0, 31 - suffix.length)}${suffix}`);
  }

  private safeSheetName(name: string): string {
    const cleaned = name.replace(/[\\/*?:\[\]]/g, '').slice(0, 31);
    return cleaned || 'Report';
  }
}
