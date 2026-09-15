import { parseCsvOrTxt } from './csv-adapter';
import { inferColumnMappings } from '../mapping/infer-mappings';
import { CONTACT_FIELDS } from '../entities/contact.fields';
import {
  buildCsv,
  isLikelyExportMetadataContact,
  splitFullName,
  parsePhoneParts,
  splitTags,
} from '../mapping/row-utils';
import { detectFormatFromBytes } from './format-detector';

describe('csv-adapter', () => {
  it('parses RFC4180 quoted commas and newlines', () => {
    const csv = Buffer.from(
      'First Name,Notes\nJane,"Hi, welcome!\nSee you soon"\n',
      'utf8',
    );
    const parsed = parseCsvOrTxt(csv);
    expect(parsed.headers).toEqual(['First Name', 'Notes']);
    expect(parsed.rows[0]['First Name']).toBe('Jane');
    expect(parsed.rows[0].Notes).toContain('Hi, welcome!');
  });

  it('auto-detects semicolon delimiter', () => {
    const csv = Buffer.from('First Name;Email\nAda;ada@example.com\n', 'utf8');
    const parsed = parseCsvOrTxt(csv);
    expect(parsed.rows[0].Email).toBe('ada@example.com');
  });

  it('renames duplicate headers', () => {
    const csv = Buffer.from('Email,Email\na@x.com,b@x.com\n', 'utf8');
    const parsed = parseCsvOrTxt(csv);
    expect(parsed.headers).toEqual(['Email', 'Email_2']);
    expect(parsed.warnings.some((w) => w.includes('Duplicate'))).toBe(true);
  });

  it('rejects header-only files', () => {
    expect(() => parseCsvOrTxt(Buffer.from('First Name,Email\n', 'utf8'))).toThrow(
      /no data rows/i,
    );
  });
});

describe('buildCsv', () => {
  it('adds UTF-8 BOM, CRLF, and Excel-safe phone cells', () => {
    const csv = buildCsv(
      ['First name', 'Phone'],
      [['Ada', '+15551234567']],
    );
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.includes('\r\n')).toBe(true);
    expect(csv).toContain('First name,Phone');
    expect(csv).toContain('"=""+15551234567"""');
  });
});

describe('export metadata detection', () => {
  it('flags Generated timestamp rows as metadata', () => {
    expect(
      isLikelyExportMetadataContact({
        firstName: 'Generated:',
        lastName: 'Aug 8, 2026 at 7:53 PM',
        displayName: 'Generated: Aug 8, 2026 at 7:53 PM',
      }),
    ).toBe(true);
    expect(
      isLikelyExportMetadataContact({
        firstName: 'Ada',
        lastName: 'Lovelace',
        displayName: 'Ada Lovelace',
      }),
    ).toBe(false);
  });
});

describe('format-detector', () => {
  it('detects xlsx magic bytes', () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const detected = detectFormatFromBytes(buf, 'text/csv', 'clients.csv');
    expect(detected.format).toBe('xlsx');
    expect(detected.mismatch).toBe(true);
  });
});

describe('mapping helpers', () => {
  it('infers contact columns from common aliases', () => {
    const mapping = inferColumnMappings(
      ['First Name', 'E-mail', 'Mobile Phone'],
      CONTACT_FIELDS,
    );
    const bySource = Object.fromEntries(
      mapping.map((m) => [m.sourceColumn, m.target]),
    );
    expect(bySource['First Name']).toBe('firstName');
    expect(bySource['E-mail']).toBe('email');
    expect(bySource['Mobile Phone']).toBe('phone');
  });

  it('splits full names and phones', () => {
    expect(splitFullName('Jane Doe')).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(parsePhoneParts('+15551234567')).toEqual({
      phoneCountryCode: '+1',
      phoneNumber: '5551234567',
    });
    expect(splitTags('VIP; Loyal, Referral')).toEqual([
      'VIP',
      'Loyal',
      'Referral',
    ]);
  });
});
