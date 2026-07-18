import { describe, expect, it } from "vitest";
import {
  SMS_GSM7_MULTI_LIMIT,
  SMS_MAX_SEGMENTS,
  SMS_UCS2_MULTI_LIMIT,
  analyzeSmsSegments,
  formatSmsSegmentCounter,
  formatUcs2CostWarning,
  gsmSeptetLength,
  isSmsWithinSegmentLimit,
} from "./sms-segment.util";

describe("sms-segment.util", () => {
  it("counts GSM-7 single segment up to 160", () => {
    const info = analyzeSmsSegments("a".repeat(160));
    expect(info.encoding).toBe("GSM-7");
    expect(info.segmentCount).toBe(1);
  });

  it("splits GSM-7 at 161 into 2 segments", () => {
    expect(analyzeSmsSegments("a".repeat(161)).segmentCount).toBe(2);
  });

  it("allows up to 306 GSM chars as 2 segments", () => {
    const text = "a".repeat(SMS_GSM7_MULTI_LIMIT * SMS_MAX_SEGMENTS);
    expect(analyzeSmsSegments(text).segmentCount).toBe(2);
    expect(isSmsWithinSegmentLimit(text)).toBe(true);
  });

  it("rejects over 306 GSM chars", () => {
    const text = "a".repeat(SMS_GSM7_MULTI_LIMIT * SMS_MAX_SEGMENTS + 1);
    expect(isSmsWithinSegmentLimit(text)).toBe(false);
  });

  it("counts extended GSM as 2 septets", () => {
    expect(gsmSeptetLength("€")).toBe(2);
  });

  it("flags UCS-2 smart quotes with a cost warning", () => {
    const info = analyzeSmsSegments(`Hello${"\u2019"}world`);
    expect(info.encoding).toBe("UCS-2");
    expect(formatUcs2CostWarning(info)).toMatch(/special character/);
  });

  it("uses UCS-2 limits 70 / 67", () => {
    expect(analyzeSmsSegments("á".repeat(70)).segmentCount).toBe(1);
    expect(analyzeSmsSegments("á".repeat(71)).segmentCount).toBe(2);
    expect(
      isSmsWithinSegmentLimit(
        "á".repeat(SMS_UCS2_MULTI_LIMIT * SMS_MAX_SEGMENTS + 1),
      ),
    ).toBe(false);
  });

  it("formats the live counter", () => {
    expect(formatSmsSegmentCounter(analyzeSmsSegments("hi"))).toBe(
      "2/160 · 1 segment",
    );
    expect(formatSmsSegmentCounter(analyzeSmsSegments("a".repeat(180)))).toBe(
      "180/306 · 2 segments (2× cost)",
    );
  });
});
