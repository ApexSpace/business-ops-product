/** Highest navbarPriority that belongs to the base/core set. */
export const NAVBAR_CORE_PRIORITY_MAX = 3;

/**
 * Extra (non-core) items stay in Apps until the viewport is at least Tailwind
 * `2xl`. Core items still appear/disappear by measured width below that.
 */
export const NAVBAR_EXTRAS_MIN_VIEWPORT_PX = 1536;

export function isNavbarCorePriority(priority?: number): boolean {
  return priority != null && priority <= NAVBAR_CORE_PRIORITY_MAX;
}

export function countCoreNavbarItems(
  priorities: Array<number | undefined>,
): number {
  return priorities.filter(isNavbarCorePriority).length;
}

export interface FittingNavbarItemsOptions {
  availableWidth: number;
  itemWidths: number[];
  gap: number;
  /** How many leading items are core (items must already be priority-sorted). */
  coreCount: number;
  /** When false, never reveal items past the core set — even if they fit. */
  extrasUnlocked: boolean;
}

/**
 * How many priority-sorted navbar items fit in `availableWidth`.
 * Core items are packed first. Overflow items are packed next only when
 * extras are unlocked, so the bar keeps pulling from Apps as space grows.
 */
export function countFittingNavbarItems({
  availableWidth,
  itemWidths,
  gap,
  coreCount,
  extrasUnlocked,
}: FittingNavbarItemsOptions): number {
  if (availableWidth <= 0 || itemWidths.length === 0) {
    return 0;
  }

  const limit = extrasUnlocked
    ? itemWidths.length
    : Math.min(Math.max(coreCount, 0), itemWidths.length);

  let used = 0;
  let count = 0;

  for (let index = 0; index < limit; index += 1) {
    const width = itemWidths[index] ?? 0;
    if (width <= 0) {
      continue;
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

export function readFlexGapPx(element: Element): number {
  const raw = window.getComputedStyle(element).columnGap;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
