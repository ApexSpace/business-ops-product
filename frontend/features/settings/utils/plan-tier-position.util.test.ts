import { describe, expect, it } from "vitest";
import {
  getPaidTierChangeLabel,
  getPlanChangeButtonLabel,
  getPlanDialogTitle,
  getRecoveryTierSubscribeLabel,
  getTierActionLabel,
  getTrialTierSubscribeLabel,
  isCanceledOrExpiredSubscription,
  isCancellationScheduled,
  isRecoveryPlanSelection,
  isRecoverySubscriptionStatus,
  resolvePlanChangeDirection,
  resolvePlanSelectionMode,
  shouldLockCurrentPlanTier,
} from "./plan-tier-position.util";

describe("plan-tier-position.util", () => {
  it("detects canceled and expired subscription statuses", () => {
    expect(isCanceledOrExpiredSubscription("CANCELED")).toBe(true);
    expect(isCanceledOrExpiredSubscription("expired")).toBe(true);
    expect(isCanceledOrExpiredSubscription("ACTIVE")).toBe(false);
  });

  it("resolves recovery mode for billing recovery and canceled subscriptions", () => {
    expect(
      resolvePlanSelectionMode({
        subscriptionStatus: "CANCELED",
        billingSource: "STRIPE",
      }),
    ).toBe("recovery");
    expect(
      resolvePlanSelectionMode({
        subscriptionStatus: "PAST_DUE",
        billingSource: "STRIPE",
      }),
    ).toBe("recovery");
    expect(
      resolvePlanSelectionMode({
        subscriptionStatus: "ACTIVE",
        billingSource: "STRIPE",
        isBillingRecovery: true,
      }),
    ).toBe("recovery");
  });

  it("detects recovery subscription statuses", () => {
    expect(isRecoverySubscriptionStatus("PENDING_PAYMENT")).toBe(true);
    expect(isRecoverySubscriptionStatus("ACTIVE")).toBe(false);
  });

  it("resolves paid-stripe and trial modes", () => {
    expect(
      resolvePlanSelectionMode({
        subscriptionStatus: "ACTIVE",
        billingSource: "STRIPE",
      }),
    ).toBe("paid-stripe");
    expect(
      resolvePlanSelectionMode({
        subscriptionStatus: "TRIALING",
        billingSource: "NOT_SELECTED",
        showTrialLayout: true,
      }),
    ).toBe("trial");
  });

  it("labels recovery tiers as subscribe again or choose this plan", () => {
    expect(getRecoveryTierSubscribeLabel(true)).toBe("Subscribe again");
    expect(getRecoveryTierSubscribeLabel(false)).toBe("Choose this plan");
    expect(getTierActionLabel("Pro", 1, 1, "recovery")).toBe("Subscribe again");
    expect(getTierActionLabel("Pro", 1, 2, "recovery")).toBe("Choose this plan");
  });

  it("keeps trial and active paid stripe labels unchanged", () => {
    expect(getTrialTierSubscribeLabel("Pro", "same")).toBe("Subscribe to Pro");
    expect(getPaidTierChangeLabel("same")).toBe("Current plan");
    expect(getPaidTierChangeLabel("higher")).toBe("Upgrade");
    expect(getPaidTierChangeLabel("lower")).toBe("Downgrade");
  });

  it("identifies recovery selection and unlocks current tier", () => {
    expect(isRecoveryPlanSelection("recovery")).toBe(true);
    expect(isRecoveryPlanSelection("paid-stripe")).toBe(false);
    expect(shouldLockCurrentPlanTier("recovery")).toBe(false);
    expect(shouldLockCurrentPlanTier("trial")).toBe(false);
    expect(shouldLockCurrentPlanTier("paid-stripe")).toBe(true);
  });

  it("uses neutral dialog titles for recovery and paid change titles for active stripe", () => {
    expect(getPlanDialogTitle("recovery")).toBe("Choose a paid plan");
    expect(getPlanDialogTitle("trial")).toBe("Choose a paid plan");
    expect(getPlanDialogTitle("paid-stripe", "downgrade")).toBe(
      "Downgrade plan",
    );
    expect(getPlanDialogTitle("paid-stripe", "upgrade")).toBe("Upgrade plan");
  });

  it("ignores requested change direction outside paid-stripe mode", () => {
    expect(resolvePlanChangeDirection("recovery", "downgrade")).toBe("both");
    expect(resolvePlanChangeDirection("trial", "upgrade")).toBe("both");
    expect(resolvePlanChangeDirection("paid-stripe", "downgrade")).toBe(
      "downgrade",
    );
  });

  it("detects cancellation scheduled for active Stripe subscriptions", () => {
    expect(
      isCancellationScheduled({
        billingSource: "STRIPE",
        subscriptionStatus: "ACTIVE",
        cancelAtPeriodEnd: true,
      }),
    ).toBe(true);
    expect(
      isCancellationScheduled({
        billingSource: "STRIPE",
        subscriptionStatus: "ACTIVE",
        cancelAtPeriodEnd: false,
      }),
    ).toBe(false);
    expect(
      isCancellationScheduled({
        billingSource: "MANUAL",
        subscriptionStatus: "ACTIVE",
        cancelAtPeriodEnd: true,
      }),
    ).toBe(false);
  });

  it("uses Change plan label when cancellation is scheduled", () => {
    expect(getPlanChangeButtonLabel("highest")).toBe("Downgrade plan");
    expect(
      getPlanChangeButtonLabel("highest", { cancellationScheduled: true }),
    ).toBe("Change plan");
  });
});
