/**
 * Twilio SMS segment calculator (GSM-7 vs UCS-2).
 * Billing is per segment; one Message SID can span multiple segments.
 *
 * @see https://www.twilio.com/docs/glossary/what-sms-character-limit
 */

export const SMS_MAX_SEGMENTS = 2;

export const SMS_GSM7_SINGLE_LIMIT = 160;
export const SMS_GSM7_MULTI_LIMIT = 153;
export const SMS_UCS2_SINGLE_LIMIT = 70;
export const SMS_UCS2_MULTI_LIMIT = 67;

/** GSM-7 basic character set (3GPP TS 23.038). */
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

/** GSM-7 extended set — each counts as 2 septets (escape + char). */
const GSM_EXTENDED = new Set(['^', '{', '}', '\\', '[', '~', ']', '|', '€']);

const GSM_BASIC_SET = new Set([...GSM_BASIC]);

export type SmsEncoding = 'GSM-7' | 'UCS-2';

export interface SmsSegmentInfo {
  encoding: SmsEncoding;
  /** Effective length used for segment math (GSM extended chars count as 2). */
  charCount: number;
  segmentCount: number;
  singleLimit: number;
  multiLimit: number;
  /** Max effective chars allowed for {@link SMS_MAX_SEGMENTS} segments. */
  maxCharsForMaxSegments: number;
  /** Distinct non-GSM characters that forced UCS-2 (up to a few for UI). */
  firstNonGsmChars: string[];
}

export function isGsm7Char(char: string): boolean {
  return GSM_BASIC_SET.has(char) || GSM_EXTENDED.has(char);
}

/**
 * Returns GSM septet length, or null if any character requires UCS-2.
 */
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

export function collectNonGsmChars(
  text: string,
  limit = 5,
): string[] {
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

  // UCS-2: count UTF-16 code units (matches SMS UCS-2 encoding).
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

export function assertSmsWithinSegmentLimit(
  text: string,
  maxSegments: number = SMS_MAX_SEGMENTS,
): SmsSegmentInfo {
  const info = analyzeSmsSegments(text);
  if (info.segmentCount > maxSegments) {
    throw new Error(
      `SMS exceeds ${maxSegments} segment limit (${info.segmentCount} segments, ${info.encoding}, ${info.charCount} chars)`,
    );
  }
  return info;
}

/** Display denominator: single-segment limit until multi-segment, then multi*N. */
export function smsSegmentDisplayLimit(info: SmsSegmentInfo): number {
  if (info.segmentCount <= 1) return info.singleLimit;
  return info.multiLimit * Math.max(info.segmentCount, SMS_MAX_SEGMENTS);
}

export function formatUcs2CostWarning(info: SmsSegmentInfo): string | null {
  if (info.encoding !== 'UCS-2' || info.firstNonGsmChars.length === 0) {
    return null;
  }
  const char = info.firstNonGsmChars[0]!;
  const label = describeNonGsmChar(char);
  return `This message contains a special character (${label}) that increases cost — remove it to send as plain text`;
}

export function describeNonGsmChar(char: string): string {
  if (char === '\u2018' || char === '\u2019') return "'";
  if (char === '\u201C' || char === '\u201D') return '"';
  if (char === '\u2013' || char === '\u2014') return '—';
  if (char === '\u2026') return '…';
  if (/\p{Extended_Pictographic}/u.test(char)) return char;
  if (char === ' ') return 'space';
  return char;
}

export function formatSmsSegmentCounter(info: SmsSegmentInfo): string {
  if (info.charCount === 0) {
    return `0/${info.singleLimit} · 0 segments`;
  }
  const limit =
    info.segmentCount <= 1
      ? info.singleLimit
      : info.multiLimit * SMS_MAX_SEGMENTS;
  const segmentLabel =
    info.segmentCount === 1
      ? '1 segment'
      : `${info.segmentCount} segments${info.segmentCount >= 2 ? ' (2× cost)' : ''}`;
  // Prefer accurate cost wording for exactly 2; for >2 still show count.
  if (info.segmentCount === 2) {
    return `${info.charCount}/${limit} · 2 segments (2× cost)`;
  }
  if (info.segmentCount > 2) {
    return `${info.charCount}/${limit} · ${info.segmentCount} segments`;
  }
  return `${info.charCount}/${limit} · ${segmentLabel}`;
}

export function buildSmsTooLongMessage(info: SmsSegmentInfo): string {
  const ucsHint = formatUcs2CostWarning(info);
  const detail = ucsHint ? ` ${ucsHint}` : '';
  return `SMS exceeds the ${SMS_MAX_SEGMENTS}-segment limit (${info.segmentCount} segments, ${info.encoding}, ${info.charCount} characters).${detail}`;
}
