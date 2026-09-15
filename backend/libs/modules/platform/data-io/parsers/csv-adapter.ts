import { parse } from 'csv-parse/sync';
import type { ParsedTabular } from '../constants/data-io.constants';

function decodeBuffer(buffer: Buffer): { text: string; warnings: string[] } {
  const warnings: string[] = [];
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: buffer.subarray(3).toString('utf8'), warnings };
  }

  const utf8 = buffer.toString('utf8');
  if (!utf8.includes('\uFFFD')) {
    return { text: utf8, warnings };
  }

  warnings.push('File encoding fell back from UTF-8; some characters may be incorrect.');
  try {
    // Node TextDecoder with latin1 preserves bytes; better than crashing.
    return { text: buffer.toString('latin1'), warnings };
  } catch {
    return { text: utf8, warnings };
  }
}

function detectDelimiter(sample: string): string {
  const firstLines = sample.split(/\r?\n/).slice(0, 5).join('\n');
  const candidates: Array<{ delim: string; score: number }> = [
    { delim: ',', score: 0 },
    { delim: ';', score: 0 },
    { delim: '\t', score: 0 },
    { delim: '|', score: 0 },
  ];
  for (const c of candidates) {
    const counts = firstLines.split(/\r?\n/).map((line) => {
      let inQuotes = false;
      let n = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (!inQuotes && ch === c.delim) n += 1;
      }
      return n;
    });
    const nonzero = counts.filter((n) => n > 0);
    if (nonzero.length === 0) continue;
    const first = nonzero[0];
    const consistent = nonzero.every((n) => n === first);
    c.score = consistent ? first * 10 + nonzero.length : first;
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.score > 0 ? candidates[0].delim : ',';
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

export function parseCsvOrTxt(
  buffer: Buffer,
  options?: { headerRowNumber?: number; maxRows?: number; format?: 'csv' | 'txt' },
): ParsedTabular {
  const { text, warnings: encodingWarnings } = decodeBuffer(buffer);
  const delimiter = detectDelimiter(text);
  const headerRowNumber = Math.max(1, options?.headerRowNumber ?? 1);
  const records = parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    relax_quotes: true,
    delimiter,
  }) as string[][];

  if (records.length < headerRowNumber) {
    throw new Error('File is empty or has no header row.');
  }

  const headerRaw = records[headerRowNumber - 1] ?? [];
  const { headers, warnings: headerWarnings } = uniquifyHeaders(
    headerRaw.map((h) => String(h ?? '')),
  );
  const nonEmptyHeaders = headers.filter((h) => h.length > 0);
  if (nonEmptyHeaders.length === 0) {
    throw new Error('No header row found. Headers are required.');
  }

  const dataRows = records.slice(headerRowNumber);
  const maxRows = options?.maxRows ?? Number.POSITIVE_INFINITY;
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < dataRows.length && rows.length < maxRows; i++) {
    const cells = dataRows[i] ?? [];
    const row: Record<string, string> = {};
    let any = false;
    headers.forEach((header, idx) => {
      if (!header) return;
      const value = String(cells[idx] ?? '').trim();
      row[header] = value;
      if (value) any = true;
    });
    if (any) rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error('File has headers but no data rows.');
  }

  return {
    headers: nonEmptyHeaders,
    rows,
    format: options?.format ?? 'csv',
    warnings: [...encodingWarnings, ...headerWarnings],
  };
}
