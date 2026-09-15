import { describe, expect, it } from "vitest";
import { getTimeGridNowScrollTop } from "./scroll-time-grid-to-now";

describe("getTimeGridNowScrollTop", () => {
  it("places now in the upper third of the grid below the sticky header", () => {
    // viewport 800, header 64, now at 1200px in the grid
    // visible grid 736, offset 0.35*736 = 257.6, scroll = 1200 - 257.6
    expect(getTimeGridNowScrollTop(1200, 800, 64, 5000)).toBe(942);
  });

  it("does not scroll above the top", () => {
    expect(getTimeGridNowScrollTop(10, 800, 64, 5000)).toBe(0);
  });

  it("does not scroll past the end of the grid", () => {
    expect(getTimeGridNowScrollTop(4000, 800, 64, 200)).toBe(200);
  });
});
