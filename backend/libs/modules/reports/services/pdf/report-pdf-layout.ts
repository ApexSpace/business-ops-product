import PDFDocument from 'pdfkit';
import type {
  ReportColumn,
  ReportDocument,
  ReportRow,
  ReportSection,
} from '../../contracts/report-document';

const PAGE_MARGIN = 40;
const HEADER_BAR_HEIGHT = 36;
const BRAND_INDIGO = '#1e3a5f';
const ROW_HEIGHT = 18;
const FONT_SIZE = 9;
const TITLE_SIZE = 14;
const HEADER_SIZE = 11;
const FOOTER_RESERVED = 36;

/**
 * Reusable PDFKit layout for all reports.
 * Receives a fully aggregated ReportDocument — no data queries here.
 */
export class ReportPdfLayout {
  render(document: ReportDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
        margins: {
          top: PAGE_MARGIN,
          bottom: PAGE_MARGIN + FOOTER_RESERVED,
          left: PAGE_MARGIN,
          right: PAGE_MARGIN,
        },
        info: {
          Title: document.meta.title,
          Author: document.meta.businessName,
          CreationDate: new Date(document.meta.generatedAt),
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawHeaderBar(doc, document);
      this.drawMeta(doc, document);

      let footnotesDrawn = false;
      for (let i = 0; i < document.sections.length; i++) {
        const section = document.sections[i]!;
        this.drawSection(doc, section, document.meta.currency, document);

        // Footnotes after overview (first section), Mangomint-style.
        if (
          !footnotesDrawn &&
          i === 0 &&
          document.meta.footnotes.length > 0
        ) {
          this.drawFootnotes(doc, document.meta.footnotes);
          footnotesDrawn = true;
        }
      }

      if (!footnotesDrawn && document.meta.footnotes.length > 0) {
        this.drawFootnotes(doc, document.meta.footnotes);
      }

      this.addPageNumbers(doc);
      doc.end();
    });
  }

  private drawHeaderBar(
    doc: PDFKit.PDFDocument,
    document: ReportDocument,
  ): void {
    const { width } = doc.page;
    doc.save();
    doc.rect(0, 0, width, HEADER_BAR_HEIGHT).fill(BRAND_INDIGO);
    doc
      .fillColor('#ffffff')
      .fontSize(HEADER_SIZE)
      .font('Helvetica-Bold')
      .text(document.meta.businessName, PAGE_MARGIN, 12, {
        width: width - PAGE_MARGIN * 2,
        align: 'left',
        lineBreak: false,
      });
    doc.restore();
    doc.y = HEADER_BAR_HEIGHT + 16;
  }

  private drawMeta(doc: PDFKit.PDFDocument, document: ReportDocument): void {
    doc
      .fillColor('#111111')
      .fontSize(TITLE_SIZE)
      .font('Helvetica-Bold')
      .text(document.meta.title, PAGE_MARGIN, doc.y);

    if (document.meta.description) {
      doc
        .moveDown(0.25)
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(document.meta.description);
    }

    const generated = new Date(document.meta.generatedAt);
    const generatedLabel = `Generated ${generated.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} at ${generated.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;

    doc
      .moveDown(0.4)
      .fontSize(9)
      .fillColor('#333333')
      .font('Helvetica')
      .text(`Period: ${document.meta.periodLabel}`)
      .text(generatedLabel);

    // Clear gap before the table (Mangomint-style breathing room).
    doc.moveDown(1.2);
  }

  private drawStaffPageHeader(
    doc: PDFKit.PDFDocument,
    document: ReportDocument,
  ): void {
    doc.y = PAGE_MARGIN;
    doc
      .fillColor('#1e3a5f')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(document.meta.title.toUpperCase(), PAGE_MARGIN, doc.y, {
        width: doc.page.width - PAGE_MARGIN * 2,
      });
    doc.moveDown(0.6);
  }

  private drawSection(
    doc: PDFKit.PDFDocument,
    section: ReportSection,
    currency: string,
    document: ReportDocument,
  ): void {
    const columns = section.columns.filter((c) => !c.excelOnly);
    if (columns.length === 0) return;

    if (section.pageBreakBefore) {
      doc.addPage();
      if (section.pageBreakHeader === 'none') {
        doc.y = PAGE_MARGIN;
      } else {
        this.drawStaffPageHeader(doc, document);
      }
    } else {
      this.ensureSpace(doc, 60);
    }

    // Tables leave doc.x at the right edge; always reset before titles/body.
    doc.x = PAGE_MARGIN;

    if (section.title) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#111111')
        .text(section.title, PAGE_MARGIN, doc.y, {
          width: doc.page.width - PAGE_MARGIN * 2,
          align: 'left',
        });
      if (section.subtitle) {
        doc
          .moveDown(0.15)
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#333333')
          .text(section.subtitle, PAGE_MARGIN, doc.y, {
            width: doc.page.width - PAGE_MARGIN * 2,
            align: 'left',
          });
      }
      doc.moveDown(0.35);
      doc.x = PAGE_MARGIN;
    } else if (section.subtitle) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#333333')
        .text(section.subtitle, PAGE_MARGIN, doc.y, {
          width: doc.page.width - PAGE_MARGIN * 2,
          align: 'left',
        });
      doc.moveDown(0.35);
      doc.x = PAGE_MARGIN;
    }

    const tableWidth = doc.page.width - PAGE_MARGIN * 2;
    const wide = columns.length >= 8;
    const fontSize = wide ? 7.5 : FONT_SIZE;
    const rowHeight = wide ? 14 : ROW_HEIGHT;
    const colWidths = this.computeColumnWidths(
      doc,
      columns,
      tableWidth,
      fontSize,
    );

    this.drawTableHeader(doc, columns, colWidths, fontSize, rowHeight);
    for (const dataRow of section.rows) {
      this.ensureSpace(doc, rowHeight + 4);
      if (doc.y <= PAGE_MARGIN + 4) {
        this.drawTableHeader(doc, columns, colWidths, fontSize, rowHeight);
      }
      this.drawTableRow(
        doc,
        columns,
        colWidths,
        dataRow,
        currency,
        fontSize,
        rowHeight,
      );
    }

    doc.moveDown(0.8);
    doc.x = PAGE_MARGIN;
  }

  private drawFootnotes(doc: PDFKit.PDFDocument, footnotes: string[]): void {
    this.ensureSpace(doc, 28);
    doc.moveDown(0.3);
    // Table drawing leaves doc.x at the right edge; reset or text runs off-page.
    doc.x = PAGE_MARGIN;
    doc.fontSize(8).fillColor('#555555').font('Helvetica');
    for (const note of footnotes) {
      doc.text(`* ${note}`, PAGE_MARGIN, doc.y, {
        width: doc.page.width - PAGE_MARGIN * 2,
        align: 'left',
      });
    }
  }

  private computeColumnWidths(
    doc: PDFKit.PDFDocument,
    columns: ReportColumn[],
    tableWidth: number,
    fontSize: number,
  ): number[] {
    doc.fontSize(fontSize).font('Helvetica-Bold');
    const flex = columns.map((c) => {
      if (c.key === 'date') return 1.15;
      if (c.format === 'int') return 0.85;
      if (c.format === 'money') return 1.05;
      return 1;
    });
    const flexTotal = flex.reduce((a, b) => a + b, 0);

    // Minimum width = longest word in the stacked label (prevents mid-word wraps).
    const mins = columns.map((col) => {
      const parts = col.label.split(/\n/);
      const longest = Math.max(
        ...parts.map((part) => doc.widthOfString(part)),
        10,
      );
      return longest + 6;
    });
    const minSum = mins.reduce((a, b) => a + b, 0);
    if (minSum >= tableWidth) {
      const scale = tableWidth / minSum;
      return mins.map((m) => m * scale);
    }

    const extra = tableWidth - minSum;
    return columns.map((_, i) => mins[i]! + (flex[i]! / flexTotal) * extra);
  }

  private drawTableHeader(
    doc: PDFKit.PDFDocument,
    columns: ReportColumn[],
    colWidths: number[],
    fontSize = FONT_SIZE,
    rowHeight = ROW_HEIGHT,
  ): void {
    const startY = doc.y;
    const lineHeight = fontSize + 2;
    doc.fontSize(fontSize).font('Helvetica-Bold').fillColor('#111111');

    const maxLines = Math.max(
      1,
      ...columns.map((col) => col.label.split('\n').length),
    );
    const headerHeight = Math.max(
      maxLines * lineHeight + 8,
      rowHeight + 8,
    );

    let x = PAGE_MARGIN;
    columns.forEach((col, i) => {
      const align = col.align ?? (col.format === 'text' ? 'left' : 'right');
      const lines = col.label.split('\n');
      lines.forEach((line, lineIndex) => {
        doc.text(line, x, startY + lineIndex * lineHeight, {
          width: colWidths[i],
          align,
          lineBreak: false,
        });
      });
      doc.y = startY;
      x += colWidths[i]!;
    });

    const lineY = startY + headerHeight - 2;
    doc
      .moveTo(PAGE_MARGIN, lineY)
      .lineTo(PAGE_MARGIN + colWidths.reduce((a, b) => a + b, 0), lineY)
      .strokeColor('#bbbbbb')
      .lineWidth(0.75)
      .stroke();
    doc.x = PAGE_MARGIN;
    doc.y = startY + headerHeight + 2;
  }

  private drawTableRow(
    doc: PDFKit.PDFDocument,
    columns: ReportColumn[],
    colWidths: number[],
    row: ReportRow,
    currency: string,
    fontSize = FONT_SIZE,
    rowHeight = ROW_HEIGHT,
  ): void {
    const y = doc.y;
    let x = PAGE_MARGIN;
    const font = row.isTotal
      ? 'Helvetica-Bold'
      : row.isGroup
        ? 'Helvetica-BoldOblique'
        : 'Helvetica';
    doc.fontSize(fontSize).font(font).fillColor('#222222');

    columns.forEach((col, i) => {
      const raw = row.cells[col.key];
      const text = this.formatCell(raw, col, currency, row.isTotal);
      const indent = (row.depth ?? 0) * 10;
      const width = colWidths[i]! - (i === 0 ? indent : 0);
      doc.text(text, x + (i === 0 ? indent : 0), y, {
        width,
        align:
          col.align ??
          (col.format === 'text' || !col.format ? 'left' : 'right'),
        lineBreak: false,
      });
      x += colWidths[i]!;
    });
    doc.y = y + rowHeight;
  }

  private formatCell(
    value: string | number | null | undefined,
    column: ReportColumn,
    currency: string,
    isTotal = false,
  ): string {
    const isNumeric =
      column.format === 'money' ||
      column.format === 'int' ||
      column.format === 'percent';

    if (value === '') return '';

    if (value == null) {
      if (isTotal && !isNumeric) return '';
      return '—';
    }
    switch (column.format) {
      case 'money': {
        const n = typeof value === 'number' ? value : Number(value);
        const prefix = currency === 'USD' ? '$' : `${currency} `;
        return `${prefix}${n.toFixed(2)}`;
      }
      case 'percent': {
        const n = typeof value === 'number' ? value : Number(value);
        return `${n.toFixed(1)}%`;
      }
      case 'int': {
        const n = typeof value === 'number' ? value : Number(value);
        return String(Math.round(n));
      }
      default:
        return String(value);
    }
  }

  private ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + needed > bottom) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
    }
  }

  private addPageNumbers(doc: PDFKit.PDFDocument): void {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);

      // Writing in the reserved footer area must not trigger a new page.
      const previousBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      doc
        .fontSize(8)
        .fillColor('#888888')
        .text(
          `Page ${i + 1} of ${range.count}`,
          PAGE_MARGIN,
          doc.page.height - 28,
          {
            width: doc.page.width - PAGE_MARGIN * 2,
            align: 'center',
            lineBreak: false,
          },
        );

      doc.page.margins.bottom = previousBottom;
    }
  }
}
