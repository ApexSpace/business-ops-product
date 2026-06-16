import { describe, expect, it } from "vitest";
import {
  resolveBillingPeriodEndField,
  resolveScheduledCancelDate,
} from "./billing-period-display.util";

describe("billing-period-display.util", () => {
  it("uses trial end only for trialing subscriptions", () => {
    expect(
      resolveBillingPeriodEndField({
        showTrialLayout: true,
        cancellationScheduled: false,
        subscription: {
          id: "sub-1",
          status: "TRIALING",
          paymentMethod: "NOT_SELECTED",
          paymentStatus: "NOT_REQUIRED",
          currentPeriodEnd: "2026-07-01",
        },
      }),
    ).toEqual({ label: "Trial ends", date: "2026-07-01" });
  });

  it("uses access until with cancelAt for scheduled cancellation", () => {
    expect(
      resolveBillingPeriodEndField({
        showTrialLayout: false,
        cancellationScheduled: true,
        subscription: {
          id: "sub-1",
          status: "ACTIVE",
          paymentMethod: "STRIPE",
          paymentStatus: "PAID",
          currentPeriodEnd: "2026-06-01",
          cancelAt: "2026-09-15",
        },
      }),
    ).toEqual({ label: "Access until", date: "2026-09-15" });
  });

  it("does not use trial layout dates for active paid subscriptions", () => {
    expect(
      resolveBillingPeriodEndField({
        showTrialLayout: false,
        cancellationScheduled: false,
        subscription: {
          id: "sub-1",
          status: "ACTIVE",
          paymentMethod: "STRIPE",
          paymentStatus: "PAID",
          currentPeriodEnd: "2026-09-15",
        },
      }),
    ).toEqual({ label: "Next billing date", date: "2026-09-15" });
  });

  it("prefers computed nextBillingDate over missing currentPeriodEnd", () => {
    expect(
      resolveBillingPeriodEndField({
        showTrialLayout: false,
        cancellationScheduled: false,
        subscription: {
          id: "sub-1",
          status: "ACTIVE",
          paymentMethod: "STRIPE",
          paymentStatus: "PAID",
          currentPeriodStart: "2026-06-01",
          currentPeriodEnd: null,
          nextBillingDate: "2026-07-01",
          nextBillingLabel: "Next billing date",
        },
      }),
    ).toEqual({ label: "Next billing date", date: "2026-07-01" });
  });

  it("uses nextBillingLabel from access resolver when provided", () => {
    expect(
      resolveBillingPeriodEndField({
        showTrialLayout: false,
        cancellationScheduled: false,
        subscription: {
          id: "sub-1",
          status: "ACTIVE",
          paymentMethod: "STRIPE",
          paymentStatus: "PAID",
          currentPeriodEnd: "2026-09-15",
          nextBillingDate: "2026-09-15",
          nextBillingLabel: "Next billing date",
        },
      }),
    ).toEqual({ label: "Next billing date", date: "2026-09-15" });
  });

  it("prefers cancelAt over stale currentPeriodEnd", () => {
    expect(
      resolveScheduledCancelDate({
        currentPeriodEnd: "2026-06-01",
        cancelAt: "2026-09-15",
      }),
    ).toBe("2026-09-15");
  });
});
