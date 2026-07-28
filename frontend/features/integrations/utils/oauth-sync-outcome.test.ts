/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import {
  oauthConnectingToastMessage,
  oauthSyncOutcomeToastMessage,
} from "./oauth-sync-outcome";

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

  it("labels Google Business Profile outcomes", () => {
    const success = oauthSyncOutcomeToastMessage("google-business-profile", 1);
    expect(success.type).toBe("success");
    expect(success.message).toContain("Google Business Profile");
    expect(success.message.toLowerCase()).toContain("location");

    const empty = oauthSyncOutcomeToastMessage("google-business-profile", 0);
    expect(empty.type).toBe("warning");
    expect(empty.message.toLowerCase()).toContain("location");
  });
});

describe("oauthConnectingToastMessage", () => {
  it("uses location copy for Google Business Profile", () => {
    expect(oauthConnectingToastMessage("google-business-profile")).toContain(
      "locations",
    );
  });
});
