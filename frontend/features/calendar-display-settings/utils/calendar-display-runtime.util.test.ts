import { describe, expect, it } from "vitest";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import {
  filterAppointmentsForCalendarDisplay,
  getMobileWeekDateKeys,
  parseVisibleTimeToMinutes,
  shouldShowCancelledAppointment,
  slotHeightForZoom,
} from "./calendar-display-runtime.util";

function appointment(
  overrides: Partial<Appointment> & Pick<Appointment, "id" | "status">,
): Appointment {
  return {
    businessId: "b1",
    calendarId: "c1",
    contactId: null,
    serviceId: null,
    workItemId: null,
    assignedToId: null,
    title: "Test",
    description: null,
    startAt: "2026-01-01T10:00:00.000Z",
    endAt: "2026-01-01T11:00:00.000Z",
    source: "INTERNAL",
    locationType: null,
    locationValue: null,
    notes: null,
    externalProvider: null,
    externalEventId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    calendar: { id: "c1", name: "Main", color: null },
    contact: null,
    service: null,
    services: [],
    assignedTo: null,
    createdBy: null,
    relatedCheckoutId: null,
    relatedCheckoutStatus: null,
    waitingNotifiedAt: null,
    ...overrides,
  };
}

describe("slotHeightForZoom", () => {
  it("maps zoom levels to pixel heights", () => {
    expect(slotHeightForZoom("SMALL")).toBe(20);
    expect(slotHeightForZoom("MEDIUM")).toBe(30);
    expect(slotHeightForZoom("LARGE")).toBe(40);
  });
});

describe("parseVisibleTimeToMinutes", () => {
  it("parses HH:mm and 24:00", () => {
    expect(parseVisibleTimeToMinutes("01:00")).toBe(60);
    expect(parseVisibleTimeToMinutes("02:00")).toBe(120);
    expect(parseVisibleTimeToMinutes("24:00")).toBe(1440);
  });
});

describe("shouldShowCancelledAppointment", () => {
  const visibility = {
    showNormalCancellation: false,
    showLateCancellation: true,
    showNoShow: false,
  };

  it("hides normal cancellations when disabled", () => {
    expect(
      shouldShowCancelledAppointment(
        appointment({ id: "1", status: "CANCELLED" }),
        visibility,
      ),
    ).toBe(false);
  });

  it("shows late cancellations when enabled", () => {
    expect(
      shouldShowCancelledAppointment(
        appointment({
          id: "2",
          status: "CANCELLED",
          metadata: { cancellationType: "late" },
        }),
        visibility,
      ),
    ).toBe(true);
  });

  it("filters list via filterAppointmentsForCalendarDisplay", () => {
    const items = [
      appointment({ id: "1", status: "CONFIRMED" }),
      appointment({ id: "2", status: "CANCELLED" }),
      appointment({
        id: "3",
        status: "CANCELLED",
        metadata: { lateCancellation: true },
      }),
    ];
    const filtered = filterAppointmentsForCalendarDisplay(items, visibility);
    expect(filtered.map((item) => item.id)).toEqual(["1", "3"]);
  });
});

describe("getMobileWeekDateKeys", () => {
  it("uses Mon-Wed slice for Sunday-start weeks", () => {
    const week = [
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
    ];
    expect(getMobileWeekDateKeys(week, "SUNDAY", 3)).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
    ]);
  });

  it("uses Mon-Wed slice from start for Monday-start weeks", () => {
    const week = [
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
      "2026-01-11",
    ];
    expect(getMobileWeekDateKeys(week, "MONDAY", 3)).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
    ]);
  });
});
