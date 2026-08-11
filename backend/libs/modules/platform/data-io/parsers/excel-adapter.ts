import ExcelJS from 'exceljs';
import type { ParsedTabular } from '../constants/data-io.constants';

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    const obj = value as unknown as Record<string, unknown>;
    if ('result' in obj && obj.result != null) {
      return cellToString(obj.result as ExcelJS.CellValue);
    }
    if ('text' in obj && typeof obj.text === 'string') {
      return obj.text.trim();
    }
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>)
        .map((t) => t.text ?? '')
        .join('')
        .trim();
    }
    if ('hyperlink' in obj && typeof obj.text === 'string') {
      return String(obj.text).trim();
    }
  }
  return String(value).trim();
}

function uniquifyHeaders(raw: string[]): { headers: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  const headers: string[] = [];
  for (const h of raw) {
    const base = (h ?? '').trim();
    if (!base) {
      headers.push('');
      continue;
    }
    const count = seen.get(base) ?? 0;
    if (count === 0) {
      headers.push(base);
      seen.set(base, 1);
    } else {
      const renamed = `${base}_${count + 1}`;
      headers.push(renamed);
      seen.set(base, count + 1);
      warnings.push(`Duplicate header "${base}" renamed to "${renamed}".`);
    }
  }
  return { headers, warnings };
}

export async function parseExcelBuffer(
  buffer: Buffer,
  options?: {
    sheetName?: string | null;
    headerRowNumber?: number;
    maxRows?: number;
    format?: 'xlsx' | 'xls';
  },
): Promise<ParsedTabular> {
  const workbook = new ExcelJS.Workbook();
  // exceljs load supports xlsx well; legacy xls may fail — caller should catch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  if (sheetNames.length === 0) {
    throw new Error('Excel workbook has no sheets.');
  }

  const worksheet =
    (options?.sheetName
      ? workbook.getWorksheet(options.sheetName)
      : undefined) ?? workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(
      options?.sheetName
        ? `Sheet "${options.sheetName}" was not found.`
        : 'Could not open Excel sheet.',
    );
  }

  const headerRowNumber = Math.max(1, options?.headerRowNumber ?? 1);
  const headerRow = worksheet.getRow(headerRowNumber);
  const rawHeaders: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    rawHeaders[colNumber - 1] = cellToString(cell.value);
  });

  const { headers, warnings } = uniquifyHeaders(rawHeaders.map((h) => h ?? ''));
  const nonEmptyHeaders = headers.filter((h) => h.length > 0);
  if (nonEmptyHeaders.length === 0) {
    throw new Error('No header row found. Headers are required.');
  }

  const maxRows = options?.maxRows ?? Number.POSITIVE_INFINITY;
  const rows: Record<string, string>[] = [];
  const lastRow = worksheet.rowCount;
  for (let r = headerRowNumber + 1; r <= lastRow && rows.length < maxRows; r++) {
    const row = worksheet.getRow(r);
    const record: Record<string, string> = {};
    let any = false;
    headers.forEach((header, idx) => {
      if (!header) return;
      const value = cellToString(row.getCell(idx + 1).value);
      record[header] = value;
      if (value) any = true;
    });
    if (any) rows.push(record);
  }

  if (rows.length === 0) {
    throw new Error('File has headers but no data rows.');
  }

  return {
    headers: nonEmptyHeaders,
    rows,
    format: options?.format ?? 'xlsx',
    sheetNames,
    warnings,
  };
}
