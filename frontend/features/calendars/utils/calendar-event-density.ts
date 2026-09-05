/**
 * Calendar event card density — driven by slot height from Display Preferences zoom.
 * Shared by grid layout + AppointmentEventCard (no feature↔feature cycle).
 */

export type CalendarEventDensity = "compact" | "comfortable" | "roomy";

export function calendarEventDensity(
  slotHeightPx: number,
): CalendarEventDensity {
  if (slotHeightPx <= 20) return "compact";
  if (slotHeightPx <= 30) return "comfortable";
  return "roomy";
}

/**
 * Floor height for a rendered event block — scales with zoom so short
 * appointments do not force overflow into neighboring slots at Small.
 */
export function eventMinHeightForSlot(slotHeightPx: number): number {
  switch (calendarEventDensity(slotHeightPx)) {
    case "compact":
      return slotHeightPx;
    case "comfortable":
      return Math.max(24, slotHeightPx);
    default:
      return Math.max(28, slotHeightPx);
  }
}

export type CalendarEventCardMetrics = {
  density: CalendarEventDensity;
  padY: number;
  padX: number;
  gap: number;
  titleLine: number;
  secondaryLine: number;
};

export function calendarEventCardMetrics(
  slotHeightPx: number,
): CalendarEventCardMetrics {
  const density = calendarEventDensity(slotHeightPx);
  switch (density) {
    case "compact":
      return {
        density,
        padY: 2,
        padX: 4,
        gap: 1,
        titleLine: 12,
        secondaryLine: 11,
      };
    case "comfortable":
      return {
        density,
        padY: 4,
        padX: 6,
        gap: 2,
        titleLine: 14,
        secondaryLine: 12,
      };
    default:
      return {
        density,
        padY: 8,
        padX: 8,
        gap: 4,
        titleLine: 16,
        secondaryLine: 14,
      };
  }
}

/** Which secondary lines fit inside a grid event of the given pixel height. */
export function calendarEventVisibleLines(
  eventHeightPx: number,
  metrics: CalendarEventCardMetrics,
): { showClient: boolean; showTime: boolean } {
  const contentBudget = Math.max(0, eventHeightPx - metrics.padY * 2);
  const titleBlock = metrics.titleLine;
  const withTime = titleBlock + metrics.gap + metrics.secondaryLine;
  const withClientAndTime =
    titleBlock + metrics.gap * 2 + metrics.secondaryLine * 2;

  return {
    showTime: contentBudget >= withTime,
    showClient: contentBudget >= withClientAndTime,
  };
}
