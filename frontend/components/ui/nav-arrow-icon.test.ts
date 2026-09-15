import { describe, expect, it } from "vitest";
import { NAV_ARROW_SIZE_PX } from "@/components/ui/nav-arrow-icon";

describe("NAV_ARROW_SIZE_PX", () => {
  it("keeps compact tokens smaller than a 16px control glyph", () => {
    expect(NAV_ARROW_SIZE_PX.sm).toBe(8);
    expect(NAV_ARROW_SIZE_PX.md).toBe(10);
    expect(NAV_ARROW_SIZE_PX.lg).toBe(12);
  });
});
