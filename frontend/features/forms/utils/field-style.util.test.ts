import { describe, expect, it } from "vitest";
import {
  getFieldSizeStyle,
  getFieldWrapperStyle,
  normalizeFieldWidth,
  parseFieldWidth,
} from "@/features/forms/utils/field-style.util";

describe("field-style.util", () => {
  it("parses width option values", () => {
    expect(parseFieldWidth("50")).toBe(50);
    expect(parseFieldWidth("100")).toBe(100);
    expect(parseFieldWidth("50%")).toBe(50);
    expect(parseFieldWidth(undefined)).toBe(100);
  });

  it("normalizes legacy width aliases", () => {
    expect(normalizeFieldWidth("half")).toBe(50);
    expect(normalizeFieldWidth("full")).toBe(100);
    expect(normalizeFieldWidth("75")).toBe(75);
  });

  it("returns inline width styles for partial field widths", () => {
    expect(getFieldSizeStyle({ width: 50 })).toEqual({
      width: "50%",
      maxWidth: "50%",
    });
    expect(getFieldSizeStyle({ width: 100 })).toEqual({});
    expect(getFieldWrapperStyle({ width: 50, marginBottom: 24 })).toEqual({
      width: "50%",
      maxWidth: "50%",
      marginBottom: "24px",
    });
  });
});
