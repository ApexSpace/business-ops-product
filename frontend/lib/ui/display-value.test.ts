import { describe, expect, it } from "vitest";
import {
  displayValue,
  displayValueCoalesce,
  isEmptyDisplayValue,
} from "@/lib/ui/display-value";

describe("displayValue", () => {
  it("returns blank for nullish, whitespace, and legacy dash placeholders", () => {
    expect(displayValue(null)).toBe("");
    expect(displayValue(undefined)).toBe("");
    expect(displayValue("")).toBe("");
    expect(displayValue("   ")).toBe("");
    expect(displayValue("—")).toBe("");
    expect(displayValue("-")).toBe("");
  });

  it("returns trimmed content for real values", () => {
    expect(displayValue("  hello  ")).toBe("hello");
    expect(displayValue("messi@barcelona.com")).toBe("messi@barcelona.com");
  });

  it("coalesces to the first non-empty value", () => {
    expect(displayValueCoalesce(null, "—", "  phone  ")).toBe("phone");
    expect(displayValueCoalesce("", undefined)).toBe("");
  });

  it("detects empty display values", () => {
    expect(isEmptyDisplayValue("—")).toBe(true);
    expect(isEmptyDisplayValue("value")).toBe(false);
  });
});
