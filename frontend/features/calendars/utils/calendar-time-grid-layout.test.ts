import { describe, expect, it } from "vitest";
import { calendarTimeGridLayout } from "./calendar-time-grid-layout";

describe("calendarTimeGridLayout", () => {
  it("shares leftover width equally in fluid mode without a forced min-width", () => {
    const layout = calendarTimeGridLayout({
      gutterPx: 80,
      columnCount: 7,
      columnMinPx: 240,
      mode: "fluid",
    });

    expect(layout.gridTemplateColumns).toBe(
      "80px repeat(7, minmax(0, 1fr))",
    );
    expect(layout.frameStyle.minWidth).toBeUndefined();
    expect(layout.frameStyle.width).toBe("100%");
  });

  it("keeps token min-width in fill mode so extra staff columns can scroll", () => {
    const layout = calendarTimeGridLayout({
      gutterPx: 80,
      columnCount: 4,
      columnMinPx: 240,
      mode: "fill",
    });

    expect(layout.gridTemplateColumns).toBe(
      "80px repeat(4, minmax(240px, 1fr))",
    );
    expect(layout.frameStyle.minWidth).toBe(80 + 4 * 240);
  });

  it("uses exact column widths in fixed mode for mobile", () => {
    const layout = calendarTimeGridLayout({
      gutterPx: 52,
      columnCount: 3,
      columnMinPx: 116,
      mode: "fixed",
    });

    expect(layout.gridTemplateColumns).toBe("52px repeat(3, 116px)");
    expect(layout.frameStyle.minWidth).toBe(52 + 3 * 116);
  });
});
