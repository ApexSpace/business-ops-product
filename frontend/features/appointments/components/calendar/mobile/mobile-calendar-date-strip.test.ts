import { describe, expect, it } from "vitest";
import {
  buildStripDateKeysFromStart,
  initialMobileStripStartKey,
  resolveStripStartKeyForAnchor,
} from "./mobile-calendar-date-strip";

const TZ = "America/New_York";

describe("mobile calendar date strip window", () => {
  it("builds consecutive days from a fixed start", () => {
    expect(buildStripDateKeysFromStart("2026-09-01", TZ)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("centers only on first load via initialMobileStripStartKey", () => {
    expect(initialMobileStripStartKey("2026-09-03", TZ)).toBe("2026-09-01");
  });

  it("keeps the window when the anchor stays inside the strip", () => {
    const start = "2026-08-30";
    expect(resolveStripStartKeyForAnchor(start, "2026-09-01", TZ)).toBe(start);
    expect(resolveStripStartKeyForAnchor(start, "2026-09-03", TZ)).toBe(start);
  });

  it("slides the window without re-centering when the anchor jumps forward", () => {
    expect(
      resolveStripStartKeyForAnchor("2026-08-30", "2026-09-10", TZ),
    ).toBe("2026-09-06");
  });

  it("slides the window when the anchor jumps backward", () => {
    expect(
      resolveStripStartKeyForAnchor("2026-09-06", "2026-08-28", TZ),
    ).toBe("2026-08-28");
  });
});
