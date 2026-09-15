import {
  SMS_GSM7_MULTI_LIMIT,
  SMS_GSM7_SINGLE_LIMIT,
  SMS_MAX_SEGMENTS,
  SMS_UCS2_MULTI_LIMIT,
  SMS_UCS2_SINGLE_LIMIT,
  analyzeSmsSegments,
  formatSmsSegmentCounter,
  formatUcs2CostWarning,
  gsmSeptetLength,
  isSmsWithinSegmentLimit,
} from './sms-segment.util';

describe('sms-segment.util', () => {
  it('counts GSM-7 single segment up to 160', () => {
    const text = 'a'.repeat(160);
    const info = analyzeSmsSegments(text);
    expect(info.encoding).toBe('GSM-7');
    expect(info.charCount).toBe(160);
    expect(info.segmentCount).toBe(1);
    expect(info.singleLimit).toBe(SMS_GSM7_SINGLE_LIMIT);
  });

  it('splits GSM-7 at 161 into 2 segments using 153 limit', () => {
    const text = 'a'.repeat(161);
    const info = analyzeSmsSegments(text);
    expect(info.encoding).toBe('GSM-7');
    expect(info.segmentCount).toBe(2);
    expect(info.multiLimit).toBe(SMS_GSM7_MULTI_LIMIT);
  });

  it('allows GSM-7 up to 306 chars as exactly 2 segments', () => {
    const text = 'a'.repeat(SMS_GSM7_MULTI_LIMIT * SMS_MAX_SEGMENTS);
    const info = analyzeSmsSegments(text);
    expect(info.segmentCount).toBe(2);
    expect(isSmsWithinSegmentLimit(text)).toBe(true);
  });

  it('rejects GSM-7 over 306 chars (3 segments)', () => {
    const text = 'a'.repeat(SMS_GSM7_MULTI_LIMIT * SMS_MAX_SEGMENTS + 1);
    const info = analyzeSmsSegments(text);
    expect(info.segmentCount).toBe(3);
    expect(isSmsWithinSegmentLimit(text)).toBe(false);
  });

  it('counts extended GSM characters as 2 septets', () => {
    expect(gsmSeptetLength('€')).toBe(2);
    expect(gsmSeptetLength('hello€')).toBe(7);
    const info = analyzeSmsSegments('€'.repeat(80));
    expect(info.encoding).toBe('GSM-7');
    expect(info.charCount).toBe(160);
    expect(info.segmentCount).toBe(1);
  });

  it('switches to UCS-2 for a smart quote', () => {
    const text = `Hello${'\u2019'}world`;
    const info = analyzeSmsSegments(text);
    expect(info.encoding).toBe('UCS-2');
    expect(info.firstNonGsmChars).toContain('\u2019');
    expect(info.singleLimit).toBe(SMS_UCS2_SINGLE_LIMIT);
    expect(formatUcs2CostWarning(info)).toMatch(/special character/);
  });

  it('switches to UCS-2 for emoji', () => {
    const text = 'Hi 👋';
    const info = analyzeSmsSegments(text);
    expect(info.encoding).toBe('UCS-2');
    expect(info.segmentCount).toBe(1);
  });

  it('uses UCS-2 multi limits (70 / 67)', () => {
    const one = 'á'.repeat(70);
    expect(analyzeSmsSegments(one).segmentCount).toBe(1);
    const two = 'á'.repeat(71);
    expect(analyzeSmsSegments(two).segmentCount).toBe(2);
    const maxTwo = 'á'.repeat(SMS_UCS2_MULTI_LIMIT * SMS_MAX_SEGMENTS);
    expect(analyzeSmsSegments(maxTwo).segmentCount).toBe(2);
    expect(isSmsWithinSegmentLimit(maxTwo)).toBe(true);
    const over = 'á'.repeat(SMS_UCS2_MULTI_LIMIT * SMS_MAX_SEGMENTS + 1);
    expect(isSmsWithinSegmentLimit(over)).toBe(false);
  });

  it('formats segment counter for 1 and 2 segments', () => {
    expect(formatSmsSegmentCounter(analyzeSmsSegments('hi'))).toBe(
      '2/160 · 1 segment',
    );
    expect(
      formatSmsSegmentCounter(analyzeSmsSegments('a'.repeat(180))),
    ).toBe('180/306 · 2 segments (2× cost)');
  });
});
