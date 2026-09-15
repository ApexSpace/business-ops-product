import { describe, expect, it } from "vitest";
import {
  calendarEventCardMetrics,
  calendarEventDensity,
  calendarEventVisibleLines,
  eventMinHeightForSlot,
} from "./calendar-event-density";

describe("calendarEventDensity", () => {
  it("maps slot heights to density tiers", () => {
    expect(calendarEventDensity(20)).toBe("compact");
    expect(calendarEventDensity(30)).toBe("comfortable");
    expect(calendarEventDensity(40)).toBe("roomy");
  });
});

describe("eventMinHeightForSlot", () => {
  it("does not inflate short blocks past one slot at compact zoom", () => {
    expect(eventMinHeightForSlot(20)).toBe(20);
    expect(eventMinHeightForSlot(30)).toBe(30);
    expect(eventMinHeightForSlot(40)).toBe(40);
  });
});

describe("calendarEventVisibleLines", () => {
  it("hides time when the block is too short for compact chrome", () => {
    const metrics = calendarEventCardMetrics(20);
    expect(calendarEventVisibleLines(20, metrics)).toEqual({
      showTime: false,
      showClient: false,
    });
  });

  it("shows title + time for a 45-minute block at compact zoom", () => {
    const metrics = calendarEventCardMetrics(20);
    // 45 min × 20px/15min = 60px
    expect(calendarEventVisibleLines(60, metrics)).toEqual({
      showTime: true,
      showClient: true,
    });
  });
});
