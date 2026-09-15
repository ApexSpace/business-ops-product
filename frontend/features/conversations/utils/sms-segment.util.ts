/**
 * Twilio SMS segment calculator (GSM-7 vs UCS-2).
 * Billing is per segment; one Message SID can span multiple segments.
 *
 * Keep in sync with backend `sms-segment.util.ts`.
 *
 * @see https://www.twilio.com/docs/glossary/what-sms-character-limit
 */

export const SMS_MAX_SEGMENTS = 2;

export const SMS_GSM7_SINGLE_LIMIT = 160;
export const SMS_GSM7_MULTI_LIMIT = 153;
export const SMS_UCS2_SINGLE_LIMIT = 70;
export const SMS_UCS2_MULTI_LIMIT = 67;

const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

const GSM_EXTENDED = new Set(['^', '{', '}', '\\', '[', '~', ']', '|', '€']);

const GSM_BASIC_SET = new Set([...GSM_BASIC]);

export type SmsEncoding = 'GSM-7' | 'UCS-2';

export interface SmsSegmentInfo {
  encoding: SmsEncoding;
  charCount: number;
  segmentCount: number;
  singleLimit: number;
  multiLimit: number;
  maxCharsForMaxSegments: number;
  firstNonGsmChars: string[];
}

export function isGsm7Char(char: string): boolean {
  return GSM_BASIC_SET.has(char) || GSM_EXTENDED.has(char);
}

export function gsmSeptetLength(text: string): number | null {
  let length = 0;
  for (const char of text) {
    if (GSM_EXTENDED.has(char)) {
      length += 2;
    } else if (GSM_BASIC_SET.has(char)) {
      length += 1;
    } else {
      return null;
    }
  }
  return length;
}

export function collectNonGsmChars(text: string, limit = 5): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const char of text) {
    if (isGsm7Char(char) || seen.has(char)) continue;
    seen.add(char);
    found.push(char);
    if (found.length >= limit) break;
  }
  return found;
}

function segmentCountForLength(
  length: number,
  singleLimit: number,
  multiLimit: number,
): number {
  if (length <= 0) return 0;
  if (length <= singleLimit) return 1;
  return Math.ceil(length / multiLimit);
}

export function analyzeSmsSegments(text: string): SmsSegmentInfo {
  const gsmLength = gsmSeptetLength(text);
  if (gsmLength !== null) {
    return {
      encoding: 'GSM-7',
      charCount: gsmLength,
      segmentCount: segmentCountForLength(
        gsmLength,
        SMS_GSM7_SINGLE_LIMIT,
        SMS_GSM7_MULTI_LIMIT,
      ),
      singleLimit: SMS_GSM7_SINGLE_LIMIT,
      multiLimit: SMS_GSM7_MULTI_LIMIT,
      maxCharsForMaxSegments: SMS_GSM7_MULTI_LIMIT * SMS_MAX_SEGMENTS,
      firstNonGsmChars: [],
    };
  }

  const ucsLength = text.length;
  return {
    encoding: 'UCS-2',
    charCount: ucsLength,
    segmentCount: segmentCountForLength(
      ucsLength,
      SMS_UCS2_SINGLE_LIMIT,
      SMS_UCS2_MULTI_LIMIT,
    ),
    singleLimit: SMS_UCS2_SINGLE_LIMIT,
    multiLimit: SMS_UCS2_MULTI_LIMIT,
    maxCharsForMaxSegments: SMS_UCS2_MULTI_LIMIT * SMS_MAX_SEGMENTS,
    firstNonGsmChars: collectNonGsmChars(text),
  };
}

export function isSmsWithinSegmentLimit(
  text: string,
  maxSegments: number = SMS_MAX_SEGMENTS,
): boolean {
  const info = analyzeSmsSegments(text);
  return info.segmentCount <= maxSegments;
}

export function describeNonGsmChar(char: string): string {
  if (char === '\u2018' || char === '\u2019') return "'";
  if (char === '\u201C' || char === '\u201D') return '"';
  if (char === '\u2013' || char === '\u2014') return '—';
  if (char === '\u2026') return '…';
  if (/\p{Extended_Pictographic}/u.test(char)) return char;
  return char;
}

export function formatUcs2CostWarning(info: SmsSegmentInfo): string | null {
  if (info.encoding !== 'UCS-2' || info.firstNonGsmChars.length === 0) {
    return null;
  }
  const label = describeNonGsmChar(info.firstNonGsmChars[0]!);
  return `This message contains a special character (${label}) that increases cost — remove it to send as plain text`;
}

export function formatSmsSegmentCounter(info: SmsSegmentInfo): string {
  if (info.charCount === 0) {
    return `0/${info.singleLimit} · 0 segments`;
  }
  const limit =
    info.segmentCount <= 1
      ? info.singleLimit
      : info.multiLimit * SMS_MAX_SEGMENTS;
  if (info.segmentCount === 2) {
    return `${info.charCount}/${limit} · 2 segments (2× cost)`;
  }
  if (info.segmentCount > 2) {
    return `${info.charCount}/${limit} · ${info.segmentCount} segments`;
  }
  return `${info.charCount}/${limit} · 1 segment`;
}
