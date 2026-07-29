import { describe, expect, it } from "vitest";
import {
  formatAppointmentStatus,
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
});
