import { describe, expect, it } from "vitest";
import {
  buildReportDateRangeOptions,
  isMonthPreset,
  monthPresetValue,
} from "./report-date-range-options";

describe("buildReportDateRangeOptions", () => {
  it("includes rolling presets and 13 named months back one year", () => {
    const options = buildReportDateRangeOptions(new Date(2026, 6, 19)); // Jul 19, 2026
    const values = options.map((o) => o.value);

    expect(values).toContain("today");
    expect(values).toContain("yesterday");
    expect(values).toContain("custom");
    expect(values).toContain("month:2026-07");
    expect(values).toContain("month:2025-07");
    expect(values).not.toContain("month:2025-06");

    const july2026 = options.find((o) => o.value === "month:2026-07");
    const july2025 = options.find((o) => o.value === "month:2025-07");
    expect(july2026?.label).toBe("July 2026");
    expect(july2025?.label).toBe("July 2025");

    const monthOptions = options.filter((o) => isMonthPreset(o.value));
    expect(monthOptions).toHaveLength(13);
  });

  it("labels today with the short date", () => {
    const options = buildReportDateRangeOptions(new Date(2026, 6, 19));
    expect(options[0]?.label).toMatch(/^Today \(/);
  });
});

describe("monthPresetValue", () => {
  it("formats zero-based months as month:YYYY-MM", () => {
    expect(monthPresetValue(2026, 0)).toBe("month:2026-01");
    expect(monthPresetValue(2025, 11)).toBe("month:2025-12");
  });
});
