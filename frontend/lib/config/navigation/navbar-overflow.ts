/** Highest navbarPriority that belongs to the base/core set. */
export const NAVBAR_CORE_PRIORITY_MAX = 3;

export function isNavbarCorePriority(priority?: number): boolean {
  return priority != null && priority <= NAVBAR_CORE_PRIORITY_MAX;
}

export function countCoreNavbarItems(
  priorities: Array<number | undefined>,
): number {
  return priorities.filter(isNavbarCorePriority).length;
}

/**
 * How many leading items fit in `availableWidth` when packed left-to-right
 * with a constant `gap`. Stops at the first item that does not fit.
 */
export function packItemsIntoWidth(
  itemWidths: number[],
  availableWidth: number,
  gap: number,
): number {
  if (availableWidth <= 0 || itemWidths.length === 0) {
    return 0;
  }

  let used = 0;
  let count = 0;

  for (const width of itemWidths) {
    if (width <= 0) {
      return count;
    }
    const next = count === 0 ? width : used + gap + width;
    if (next > availableWidth + 0.5) {
      break;
    }
    used = next;
    count += 1;
  }

  return count;
}

/** Remember the track width at which the full core set first fitted. */
export function captureExtrasOriginWidth(
  availableWidth: number,
  coreVisible: number,
  coreCount: number,
  currentOrigin: number | null,
): number | null {
  if (currentOrigin != null) return currentOrigin;
  if (availableWidth <= 0 || coreVisible < coreCount) return null;
  return availableWidth;
}

export interface FittingNavbarItemsOptions {
  availableWidth: number;
  itemWidths: number[];
  gap: number;
  /** How many leading items are core (items must already be priority-sorted). */
  coreCount: number;
  /**
   * Track width at which extra capacity is zero (full core set just fitted).
   * Extra items pack only into growth past this width, so they appear
   * one-by-one instead of consuming the leftover slack in a single pass.
   */
  extrasOriginWidth: number;
}

/**
 * Pack core items into the live track, then pack overflow items into the
 * extra capacity that appears as the track grows past `extrasOriginWidth`.
 */
export function countFittingNavbarItems({
  availableWidth,
  itemWidths,
  gap,
  coreCount,
  extrasOriginWidth,
}: FittingNavbarItemsOptions): number {
  const safeCoreCount = Math.min(Math.max(coreCount, 0), itemWidths.length);
  const coreWidths = itemWidths.slice(0, safeCoreCount);
  const extraWidths = itemWidths.slice(safeCoreCount);

  const coreVisible = packItemsIntoWidth(coreWidths, availableWidth, gap);
  if (coreVisible < safeCoreCount) {
    return coreVisible;
  }

  const extraBudget = Math.max(0, availableWidth - extrasOriginWidth);
  const extraVisible = packItemsIntoWidth(extraWidths, extraBudget, gap);

  return safeCoreCount + extraVisible;
}

export function readFlexGapPx(element: Element): number {
  const raw = window.getComputedStyle(element).columnGap;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
