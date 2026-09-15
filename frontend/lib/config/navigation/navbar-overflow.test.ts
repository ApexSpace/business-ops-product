import { describe, expect, it } from "vitest";
import {
  captureExtrasOriginWidth,
  countCoreNavbarItems,
  countFittingNavbarItems,
  isNavbarCorePriority,
  NAVBAR_CORE_PRIORITY_MAX,
  packItemsIntoWidth,
} from "./navbar-overflow";

const CORE = [80, 90, 80, 110, 70];
const EXTRAS = [80, 90, 100, 95, 85, 88];
const WIDTHS = [...CORE, ...EXTRAS];
const GAP = 8;
const CORE_COUNT = CORE.length;

function packedWidth(widths: number[], count: number): number {
  if (count <= 0) return 0;
  return widths.slice(0, count).reduce((sum, width, index) => {
    return index === 0 ? width : sum + GAP + width;
  }, 0);
}

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

  it("stops packing at the first item that does not fit", () => {
    expect(packItemsIntoWidth([80, 90, 80], 80 + GAP + 90, GAP)).toBe(2);
    expect(packItemsIntoWidth([80, 90, 80], 80 + GAP + 90 + GAP + 79, GAP)).toBe(
      2,
    );
  });

  it("keeps overflow items out at the extras origin even when leftover would fit them", () => {
    const origin = packedWidth(CORE, CORE_COUNT) + 400;
    expect(
      countFittingNavbarItems({
        availableWidth: origin,
        itemWidths: WIDTHS,
        gap: GAP,
        coreCount: CORE_COUNT,
        extrasOriginWidth: origin,
      }),
    ).toBe(CORE_COUNT);
  });

  it("adds exactly one overflow item when extra capacity fits only that item", () => {
    const origin = packedWidth(CORE, CORE_COUNT) + 400;
    const firstExtra = EXTRAS[0]!;
    expect(
      countFittingNavbarItems({
        availableWidth: origin + firstExtra,
        itemWidths: WIDTHS,
        gap: GAP,
        coreCount: CORE_COUNT,
        extrasOriginWidth: origin,
      }),
    ).toBe(CORE_COUNT + 1);
    expect(
      countFittingNavbarItems({
        availableWidth: origin + firstExtra + GAP + EXTRAS[1]! - 1,
        itemWidths: WIDTHS,
        gap: GAP,
        coreCount: CORE_COUNT,
        extrasOriginWidth: origin,
      }),
    ).toBe(CORE_COUNT + 1);
  });

  it("adds the next overflow item only after its full width is available", () => {
    const origin = packedWidth(CORE, CORE_COUNT) + 400;
    const twoExtras = packedWidth(EXTRAS, 2);
    expect(
      countFittingNavbarItems({
        availableWidth: origin + twoExtras,
        itemWidths: WIDTHS,
        gap: GAP,
        coreCount: CORE_COUNT,
        extrasOriginWidth: origin,
      }),
    ).toBe(CORE_COUNT + 2);
  });

  it("removes overflow items one-by-one as extra capacity shrinks", () => {
    const origin = packedWidth(CORE, CORE_COUNT) + 400;
    const three = countFittingNavbarItems({
      availableWidth: origin + packedWidth(EXTRAS, 3),
      itemWidths: WIDTHS,
      gap: GAP,
      coreCount: CORE_COUNT,
      extrasOriginWidth: origin,
    });
    const two = countFittingNavbarItems({
      availableWidth: origin + packedWidth(EXTRAS, 2),
      itemWidths: WIDTHS,
      gap: GAP,
      coreCount: CORE_COUNT,
      extrasOriginWidth: origin,
    });
    const one = countFittingNavbarItems({
      availableWidth: origin + packedWidth(EXTRAS, 1),
      itemWidths: WIDTHS,
      gap: GAP,
      coreCount: CORE_COUNT,
      extrasOriginWidth: origin,
    });
    expect(three).toBe(CORE_COUNT + 3);
    expect(two).toBe(CORE_COUNT + 2);
    expect(one).toBe(CORE_COUNT + 1);
  });

  it("drops core items one-by-one before extras when the track is too narrow", () => {
    const origin = packedWidth(CORE, CORE_COUNT) + 400;
    const fourCore = packedWidth(CORE, 4);
    expect(
      countFittingNavbarItems({
        availableWidth: fourCore,
        itemWidths: WIDTHS,
        gap: GAP,
        coreCount: CORE_COUNT,
        extrasOriginWidth: origin,
      }),
    ).toBe(4);
  });

  it("never emits a count above the item list", () => {
    expect(
      countFittingNavbarItems({
        availableWidth: 10_000,
        itemWidths: [40, 40],
        gap: GAP,
        coreCount: 2,
        extrasOriginWidth: 80,
      }),
    ).toBe(2);
  });

  it("captures extras origin only when the full core set first fits", () => {
    expect(captureExtrasOriginWidth(800, 4, 5, null)).toBeNull();
    expect(captureExtrasOriginWidth(0, 5, 5, null)).toBeNull();
    expect(captureExtrasOriginWidth(800, 5, 5, null)).toBe(800);
    expect(captureExtrasOriginWidth(900, 5, 5, 800)).toBe(800);
  });
});
