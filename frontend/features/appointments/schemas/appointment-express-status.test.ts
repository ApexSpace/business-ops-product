import { describe, expect, it } from "vitest";
import { formatAppointmentStatus } from "@/features/appointments/schemas/appointment-profile";

describe("formatAppointmentStatus", () => {
  it("labels pending express bookings", () => {
    expect(formatAppointmentStatus("PENDING_COMPLETION")).toBe(
      "Pending completion",
    );
  });
});
