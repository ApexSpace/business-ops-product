/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { oauthSyncOutcomeToastMessage } from "./oauth-sync-outcome";

describe("oauthSyncOutcomeToastMessage", () => {
  it("returns success when resources were found", () => {
    const outcome = oauthSyncOutcomeToastMessage("facebook", 2);
    expect(outcome.type).toBe("success");
    expect(outcome.message).toContain("Facebook");
  });

  it("returns warning when no resources were found", () => {
    const outcome = oauthSyncOutcomeToastMessage("instagram", 0);
    expect(outcome.type).toBe("warning");
    expect(outcome.message.toLowerCase()).toContain("instagram");
  });
});
