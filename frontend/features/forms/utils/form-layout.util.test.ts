import { describe, expect, it } from "vitest";
import {
  applyFormLayoutPreset,
  inferFormLayoutFromMaxWidth,
  resolveFormLayout,
} from "@/features/forms/utils/form-layout.util";

describe("form-layout.util", () => {
  it("maps legacy max width values to the nearest preset", () => {
    expect(inferFormLayoutFromMaxWidth(640)).toBe("container");
    expect(inferFormLayoutFromMaxWidth(800)).toBe("wide");
    expect(inferFormLayoutFromMaxWidth(750)).toBe("wide");
    expect(inferFormLayoutFromMaxWidth(undefined)).toBe("full");
  });

  it("prefers layoutWidth when present", () => {
    expect(
      resolveFormLayout({ layoutWidth: "spacious", maxWidth: 640 }),
    ).toBe("spacious");
  });

  it("applies preset values to settings", () => {
    expect(applyFormLayoutPreset("wide")).toEqual({
      layoutWidth: "wide",
      maxWidth: 800,
    });
    expect(applyFormLayoutPreset("full")).toEqual({
      layoutWidth: "full",
      maxWidth: undefined,
    });
  });
});
