/**
 * Place the current-time line in the upper third of the grid below the sticky
 * day/staff header (same idea as Google Calendar “now”).
 */
export function getTimeGridNowScrollTop(
  currentTimeTopPx: number,
  viewportHeight: number,
  stickyHeaderHeight: number,
  maxScrollTop: number,
): number {
  const visibleGrid = Math.max(0, viewportHeight - stickyHeaderHeight);
  const raw = currentTimeTopPx - visibleGrid * 0.35;
  return Math.min(maxScrollTop, Math.max(0, Math.round(raw)));
}

export function scrollTimeGridToNow(
  host: HTMLElement,
  currentTimeTopPx: number,
  stickyHeaderHeight: number,
): void {
  if (host.clientHeight <= 0) return;
  const maxScrollTop = Math.max(0, host.scrollHeight - host.clientHeight);
  const top = getTimeGridNowScrollTop(
    currentTimeTopPx,
    host.clientHeight,
    stickyHeaderHeight,
    maxScrollTop,
  );
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  host.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
}
