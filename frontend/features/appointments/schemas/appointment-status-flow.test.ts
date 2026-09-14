import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_FILTER_STATUS_OPTIONS,
  APPOINTMENT_LIFECYCLE_STATUS_OPTIONS,
  formatAppointmentStatus,
  getAppointmentOverflowStatusOptions,
  getAppointmentStatusDisplayLabel,
  isCheckoutOpen,
  requiresClosedSaleEditAcknowledgement,
} from "./appointment-profile";

describe("appointment status flow helpers", () => {
  it("labels completed appointments as Closed", () => {
    expect(formatAppointmentStatus("COMPLETED")).toBe("Closed");
  });

  it("shows Checking out when in service with an open checkout", () => {
    expect(
      getAppointmentStatusDisplayLabel("IN_SERVICE", "checkout-id", "OPEN"),
    ).toBe("Checking out");
  });

  it("treats paid checkouts as closed", () => {
    expect(isCheckoutOpen("PAID")).toBe(false);
    expect(isCheckoutOpen("OPEN")).toBe(true);
  });

  it("requires acknowledgement before editing a closed paid sale", () => {
    expect(
      requiresClosedSaleEditAcknowledgement({
        status: "COMPLETED",
        relatedCheckoutId: "checkout-1",
        relatedCheckoutStatus: "PAID",
      }),
    ).toBe(true);
    expect(
      requiresClosedSaleEditAcknowledgement({
        status: "CONFIRMED",
        relatedCheckoutId: "checkout-1",
        relatedCheckoutStatus: "PAID",
      }),
    ).toBe(false);
    expect(
      requiresClosedSaleEditAcknowledgement({
        status: "COMPLETED",
        relatedCheckoutId: null,
        relatedCheckoutStatus: null,
      }),
    ).toBe(false);
  });

  it("includes No Show in staff lifecycle options without Cancelled", () => {
    const values = APPOINTMENT_LIFECYCLE_STATUS_OPTIONS.map((o) => o.value);
    expect(values).toContain("NO_SHOW");
    expect(values).not.toContain("CANCELLED");
    expect(formatAppointmentStatus("NO_SHOW")).toBe("No Show");
  });

  it("keeps Cancelled and No Show in filters without duplicating No Show", () => {
    const values = APPOINTMENT_FILTER_STATUS_OPTIONS.map((o) => o.value);
    expect(values.filter((value) => value === "NO_SHOW")).toHaveLength(1);
    expect(values).toContain("CANCELLED");
  });

  it("hides WAITING from overflow options when waiting room is off", () => {
    expect(
      getAppointmentOverflowStatusOptions(true).map((o) => o.value),
    ).toContain("WAITING");
    expect(
      getAppointmentOverflowStatusOptions(false).map((o) => o.value),
    ).not.toContain("WAITING");
    expect(
      getAppointmentOverflowStatusOptions(false).map((o) => o.value),
    ).toContain("NO_SHOW");
  });
});
