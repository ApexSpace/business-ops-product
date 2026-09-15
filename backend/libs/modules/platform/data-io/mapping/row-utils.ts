import type { ColumnMappingEntry } from '../constants/data-io.constants';

export function applyRowMapping(
  row: Record<string, string>,
  mapping: ColumnMappingEntry[],
): { fields: Record<string, string>; appendNotes: string[] } {
  const fields: Record<string, string> = {};
  const appendNotes: string[] = [];

  for (const entry of mapping) {
    const raw = (row[entry.sourceColumn] ?? '').trim();
    if (!raw) continue;

    if (entry.action === 'skip' || !entry.target) {
      continue;
    }
    if (entry.action === 'append_to_notes') {
      appendNotes.push(`${entry.sourceColumn}: ${raw}`);
      continue;
    }
    if (entry.target === 'fullName') {
      fields.fullName = raw;
      continue;
    }
    fields[entry.target] = raw;
  }

  return { fields, appendNotes };
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  if (!trimmed) return { firstName: '', lastName: '' };
  const idx = trimmed.indexOf(' ');
  if (idx === -1) return { firstName: trimmed, lastName: '' };
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1).trim(),
  };
}

export function parsePhoneParts(
  raw: string,
  defaultCountryCode?: string,
): { phoneCountryCode?: string; phoneNumber?: string } {
  const cleaned = raw.trim();
  if (!cleaned) return {};

  const digitsAndPlus = cleaned.replace(/[^\d+]/g, '');
  if (digitsAndPlus.startsWith('+')) {
    // Prefer NANP (+1) then try 1–3 digit country codes from longest match that leaves 7–15 national digits.
    const rest = digitsAndPlus.slice(1);
    for (const codeLen of [1, 2, 3]) {
      if (rest.length <= codeLen) continue;
      const cc = rest.slice(0, codeLen);
      const national = rest.slice(codeLen);
      if (national.length >= 7 && national.length <= 15) {
        // Prefer +1 when remaining looks like NANP
        if (codeLen === 1 && cc === '1' && national.length === 10) {
          return { phoneCountryCode: '+1', phoneNumber: national };
        }
        if (codeLen > 1 || cc !== '1') {
          return { phoneCountryCode: `+${cc}`, phoneNumber: national };
        }
      }
    }
    if (rest.length >= 8) {
      return {
        phoneCountryCode: `+${rest.slice(0, 1)}`,
        phoneNumber: rest.slice(1),
      };
    }
  }

  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return {};

  if (defaultCountryCode) {
    return {
      phoneCountryCode: defaultCountryCode,
      phoneNumber: digits,
    };
  }

  if (digits.length === 10) {
    return { phoneCountryCode: '+1', phoneNumber: digits };
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return { phoneCountryCode: '+1', phoneNumber: digits.slice(1) };
  }

  return { phoneNumber: digits };
}

export function splitTags(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function sanitizeCsvCell(value: string): string {
  let out = value;
  if (/^[=+\-@]/.test(out)) {
    out = `'${out}`;
  }
  if (/[",\n\r]/.test(out)) {
    return `"${out.replace(/"/g, '""')}"`;
  }
  return out;
}

/**
 * Keep long numeric / phone values as text in Excel (avoid 1.2E+10).
 * Emits an Excel text formula cell: ="value"
 */
export function excelSafeCsvCell(value: string): string {
  const raw = String(value ?? '');
  const trimmed = raw.trim();
  if (
    trimmed.length >= 8 &&
    (/^\d[\d\s().-]*$/.test(trimmed) || /^\+\d[\d\s().-]*$/.test(trimmed))
  ) {
    return `"=""${raw.replace(/"/g, '""')}"""`;
  }
  return sanitizeCsvCell(raw);
}

/** UTF-8 BOM + CRLF so Excel on Windows opens columns cleanly. */
export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map((row) =>
      row.map((c) => excelSafeCsvCell(String(c ?? ''))).join(','),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Detect report/export metadata that was mistakenly stored as a contact
 * (e.g. firstName "Generated:", lastName "Aug 8, 2026 at 7:53 PM").
 */
export function isLikelyExportMetadataContact(parts: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}): boolean {
  const first = (parts.firstName ?? '').trim();
  const last = (parts.lastName ?? '').trim();
  const display = (parts.displayName ?? '').trim();
  const combined = display || [first, last].filter(Boolean).join(' ');

  if (/^generated:?$/i.test(first) && /\d{4}/.test(last)) {
    return true;
  }
  if (/^generated:?\s+/i.test(combined) && /\b\d{4}\b/.test(combined)) {
    return true;
  }
  return false;
}

export function coerceBoolean(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'active', 'enabled'].includes(v)) return true;
  if (['false', 'no', 'n', '0', 'inactive', 'disabled'].includes(v)) return false;
  return null;
}

export function coerceMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
