import { describe, expect, it } from "vitest";
import { displayInitials } from "./display-initials";

describe("displayInitials", () => {
  it("uses first letters of first two words for multi-word names", () => {
    expect(displayInitials("Mirza Shahbaz")).toBe("MS");
    expect(displayInitials("John Paul Smith")).toBe("JP");
  });

  it("uses first two characters for single-word names", () => {
    expect(displayInitials("Mirza")).toBe("MI");
    expect(displayInitials("You")).toBe("YO");
  });

  it("returns ? for empty or placeholder names", () => {
    expect(displayInitials("")).toBe("?");
    expect(displayInitials("   ")).toBe("?");
    expect(displayInitials("—")).toBe("?");
  });
});
