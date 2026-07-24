import { describe, expect, it } from "vitest";
import {
  canDowngrade,
  canUpgrade,
  getPlanChangeButtonLabel,
  getTierPosition,
} from "./plan-tier-position.util";

describe("plan-tier-position.util", () => {
  it("ranks lowest / middle / highest for CTA matrix", () => {
    expect(getTierPosition(0, 3)).toBe("lowest");
    expect(getTierPosition(1, 3)).toBe("middle");
    expect(getTierPosition(2, 3)).toBe("highest");
    expect(getTierPosition(0, 1)).toBe("only");
    expect(getTierPosition(-1, 3)).toBe("unknown");
  });

  it("exposes upgrade only on lowest, downgrade only on highest", () => {
    expect(canUpgrade("lowest")).toBe(true);
    expect(canDowngrade("lowest")).toBe(false);
    expect(canUpgrade("highest")).toBe(false);
    expect(canDowngrade("highest")).toBe(true);
    expect(canUpgrade("middle")).toBe(true);
    expect(canDowngrade("middle")).toBe(true);
  });

  it("labels buttons by rank", () => {
    expect(getPlanChangeButtonLabel("lowest")).toBe("Upgrade tier");
    expect(getPlanChangeButtonLabel("highest")).toBe("Downgrade tier");
    expect(getPlanChangeButtonLabel("middle")).toBe("Upgrade / Downgrade tier");
  });
});
