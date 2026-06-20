import { describe, expect, it } from "vitest";
import {
  businessHoursToSlots,
  defaultBusinessHoursSchedule,
  hasConfiguredSchedule,
  slotsToBusinessHoursSchedule,
} from "./chatbot-business-hours.util";

describe("chatbot-business-hours.util", () => {
  it("round-trips weekday slots to schedule", () => {
    const slots = businessHoursToSlots({
      enabled: true,
      timezone: "America/New_York",
      schedule: {
        "1": [{ start: "09:00", end: "17:00" }],
        "5": [{ start: "10:00", end: "14:00" }],
      },
    });

    expect(slots.find((s) => s.weekday === "1")).toMatchObject({
      isEnabled: true,
      start: "09:00",
      end: "17:00",
    });
    expect(slots.find((s) => s.weekday === "2")?.isEnabled).toBe(false);

    const schedule = slotsToBusinessHoursSchedule(slots);
    expect(schedule["1"]).toEqual([{ start: "09:00", end: "17:00" }]);
    expect(schedule["5"]).toEqual([{ start: "10:00", end: "14:00" }]);
    expect(schedule["2"]).toBeUndefined();
  });

  it("detects configured schedules", () => {
    expect(hasConfiguredSchedule({})).toBe(false);
    expect(hasConfiguredSchedule(defaultBusinessHoursSchedule())).toBe(true);
  });
});
