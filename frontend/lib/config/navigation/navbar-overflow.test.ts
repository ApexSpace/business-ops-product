import { describe, expect, it } from "vitest";
import {
  countCoreNavbarItems,
  countFittingNavbarItems,
  isNavbarCorePriority,
  NAVBAR_CORE_PRIORITY_MAX,
} from "./navbar-overflow";

describe("navbar overflow", () => {
  it("treats priorities 1–3 as the core set", () => {
    expect(NAVBAR_CORE_PRIORITY_MAX).toBe(3);
    expect(isNavbarCorePriority(1)).toBe(true);
    expect(isNavbarCorePriority(3)).toBe(true);
    expect(isNavbarCorePriority(4)).toBe(false);
    expect(isNavbarCorePriority(undefined)).toBe(false);
  });

  it("counts leading core items for the base navbar", () => {
    expect(countCoreNavbarItems([1, 1, 2, 3, 3, 4, 5, 6])).toBe(5);
  });

  it("hides overflow items at base width even when they would fit", () => {
    const visible = countFittingNavbarItems({
      availableWidth: 2000,
      itemWidths: [80, 90, 80, 110, 70, 80, 90, 100],
      gap: 8,
      coreCount: 5,
      extrasUnlocked: false,
    });
    expect(visible).toBe(5);
  });

  it("keeps pulling overflow items after Products when extras are unlocked", () => {
    const visible = countFittingNavbarItems({
      availableWidth: 900,
      itemWidths: [80, 90, 80, 110, 70, 80, 90, 100, 95],
      gap: 8,
      coreCount: 5,
      extrasUnlocked: true,
    });
    expect(visible).toBeGreaterThan(7);
    expect(visible).toBe(9);
  });

  it("drops lower-priority items as the track shrinks", () => {
    const itemWidths = [80, 90, 80, 110, 70, 80, 90];
    const wide = countFittingNavbarItems({
      availableWidth: 800,
      itemWidths,
      gap: 8,
      coreCount: 5,
      extrasUnlocked: true,
    });
    const narrow = countFittingNavbarItems({
      availableWidth: 280,
      itemWidths,
      gap: 8,
      coreCount: 5,
      extrasUnlocked: true,
    });
    expect(wide).toBeGreaterThan(narrow);
    expect(narrow).toBeGreaterThanOrEqual(1);
    expect(narrow).toBeLessThan(5);
  });

  it("never emits a count above the item list", () => {
    expect(
      countFittingNavbarItems({
        availableWidth: 10_000,
        itemWidths: [40, 40],
        gap: 8,
        coreCount: 2,
        extrasUnlocked: true,
      }),
    ).toBe(2);
  });
});
