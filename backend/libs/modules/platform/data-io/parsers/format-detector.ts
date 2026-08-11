export type DetectedFormat = 'csv' | 'xlsx' | 'xls' | 'txt' | 'pdf' | 'unknown';

const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // ZIP / OOXML
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // OLE compound
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

function startsWith(buf: Buffer, magic: number[]): boolean {
  if (buf.length < magic.length) return false;
  return magic.every((b, i) => buf[i] === b);
}

export function detectFormatFromBytes(
  buffer: Buffer,
  mimeType?: string | null,
  fileName?: string | null,
): { format: DetectedFormat; extensionHint: string | null; mismatch: boolean } {
  const ext = fileName?.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
    : null;

  let contentFormat: DetectedFormat = 'unknown';
  if (startsWith(buffer, PDF_MAGIC)) contentFormat = 'pdf';
  else if (startsWith(buffer, XLSX_MAGIC)) contentFormat = 'xlsx';
  else if (startsWith(buffer, XLS_MAGIC)) contentFormat = 'xls';
  else if (looksLikeText(buffer)) {
    contentFormat = ext === 'txt' ? 'txt' : 'csv';
  }

  const mimeHint = mimeToFormat(mimeType);
  const extHint = extToFormat(ext);

  let format = contentFormat;
  if (format === 'unknown') {
    format = mimeHint ?? extHint ?? 'unknown';
  }

  const declared = mimeHint ?? extHint;
  const mismatch = Boolean(
    declared &&
      format !== 'unknown' &&
      declared !== format &&
      !(declared === 'csv' && format === 'txt') &&
      !(declared === 'txt' && format === 'csv'),
  );

  return { format, extensionHint: ext, mismatch };
}

function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  let weird = 0;
  for (const b of sample) {
    if (b === 0) return false;
    if (b < 7 || (b > 14 && b < 32 && b !== 9 && b !== 10 && b !== 13)) {
      weird += 1;
    }
  }
  return weird / Math.max(sample.length, 1) < 0.05;
}

function mimeToFormat(mime?: string | null): DetectedFormat | null {
  if (!mime) return null;
  const m = mime.toLowerCase();
  if (m.includes('spreadsheetml') || m.includes('xlsx')) return 'xlsx';
  if (m.includes('ms-excel') || m === 'application/vnd.ms-excel') return 'xls';
  if (m.includes('csv') || m === 'text/csv') return 'csv';
  if (m === 'text/plain') return 'txt';
  if (m.includes('pdf')) return 'pdf';
  return null;
}

function extToFormat(ext?: string | null): DetectedFormat | null {
  if (!ext) return null;
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  if (ext === 'csv') return 'csv';
  if (ext === 'txt' || ext === 'tsv') return 'txt';
  if (ext === 'pdf') return 'pdf';
  return null;
}
