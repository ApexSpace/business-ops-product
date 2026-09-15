import { describe, expect, it } from "vitest";
import {
  buildAppointmentSchedulePayload,
  computeAppointmentEndMinutes,
  formatDurationLabel,
  rechainServiceLinesAfterChange,
  sumServiceLineDurations,
} from "./appointment-service-lines";

describe("appointment-service-lines", () => {
  const baseLine = {
    serviceId: "svc-1",
    name: "Haircut",
    price: "50.00",
    assignedToId: "staff-1",
    startMinutes: 9 * 60,
    occupancyMinutes: 60,
    clientOccupancyMinutes: 60,
    staffBlockedMinutes: 75,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 5,
  };

  it("formats duration labels", () => {
    expect(formatDurationLabel(15)).toBe("15 min");
    expect(formatDurationLabel(60)).toBe("1 hr");
    expect(formatDurationLabel(90)).toBe("1 hr 30 min");
  });

  it("sums service durations and computes end minutes", () => {
    const lines = [
      baseLine,
      { ...baseLine, serviceId: "svc-2", startMinutes: 10 * 60, occupancyMinutes: 30 },
    ];
    expect(sumServiceLineDurations(lines)).toBe(90);
    expect(computeAppointmentEndMinutes(9 * 60, lines)).toBe(10 * 60 + 30);
  });

  it("rechains later services after duration change", () => {
    const lines = [
      baseLine,
      { ...baseLine, serviceId: "svc-2", startMinutes: 10 * 60, occupancyMinutes: 30 },
    ];
    const next = rechainServiceLinesAfterChange(
      lines.map((line, index) =>
        index === 0 ? { ...line, occupancyMinutes: 45 } : line,
      ),
      9 * 60,
      0,
    );
    expect(next[1]?.startMinutes).toBe(9 * 60 + 45);
  });

  it("builds API schedule payload from local schedule", () => {
    const payload = buildAppointmentSchedulePayload({
      dateKey: "2026-07-08",
      appointmentStartMinutes: 9 * 60 + 15,
      lines: [baseLine],
      timezone: "America/New_York",
    });
    expect(payload.services).toHaveLength(1);
    expect(payload.services[0]?.durationMinutes).toBe(60);
    expect(new Date(payload.endAt).getTime()).toBeGreaterThan(
      new Date(payload.startAt).getTime(),
    );
  });
});
