import { describe, expect, it } from "vitest";
import {
  getMetaOAuthStartUrl,
  getOAuthStartUrl,
  getPlatformMetaOAuthStartUrl,
  parseInstagramAuthFlowFromConfig,
} from "@/features/integrations/utils/integrations";
import {
  getInstagramConnectionMethodLabel,
  getIntegrationManageCopy,
} from "@/features/integrations/utils/integration-manage-copy";

describe("instagram dual connect helpers", () => {
  it("appends authFlow to business Meta start URLs", () => {
    expect(getMetaOAuthStartUrl("instagram", "facebook_login")).toBe(
      "/api/oauth/meta/start?providerKey=instagram&authFlow=facebook_login",
    );
    expect(getMetaOAuthStartUrl("instagram", "instagram_login")).toBe(
      "/api/oauth/meta/start?providerKey=instagram&authFlow=instagram_login",
    );
    expect(getMetaOAuthStartUrl("facebook")).toBe(
      "/api/oauth/meta/start?providerKey=facebook",
    );
  });

  it("appends authFlow to platform Meta start URLs", () => {
    expect(
      getPlatformMetaOAuthStartUrl("instagram", "instagram_login"),
    ).toBe(
      "/api/oauth/meta/platform/start?providerKey=instagram&authFlow=instagram_login",
    );
  });

  it("routes getOAuthStartUrl for Instagram Direct", () => {
    expect(
      getOAuthStartUrl("instagram", { authFlow: "instagram_login" }),
    ).toContain("authFlow=instagram_login");
    expect(
      getOAuthStartUrl("instagram", {
        host: "platform",
        authFlow: "facebook_login",
      }),
    ).toBe(
      "/api/oauth/meta/platform/start?providerKey=instagram&authFlow=facebook_login",
    );
  });

  it("routes platform Google Business Profile start URL", () => {
    expect(
      getOAuthStartUrl("google-business-profile", { host: "platform" }),
    ).toBe(
      "/api/oauth/google/platform/start?providerKey=google-business-profile",
    );
  });

  it("parses authFlow from integration config", () => {
    expect(parseInstagramAuthFlowFromConfig({ authFlow: "INSTAGRAM_LOGIN" })).toBe(
      "INSTAGRAM_LOGIN",
    );
    expect(parseInstagramAuthFlowFromConfig({})).toBe("FACEBOOK_LOGIN");
    expect(parseInstagramAuthFlowFromConfig(null)).toBe("FACEBOOK_LOGIN");
  });

  it("uses Direct-specific manage copy without Facebook Page checklist", () => {
    const direct = getIntegrationManageCopy("instagram", {
      authFlow: "INSTAGRAM_LOGIN",
    });
    expect(direct.emptyState.checklist.join(" ")).not.toMatch(/Facebook Page/i);
    expect(direct.description).toMatch(/Direct Instagram/i);

    const withFb = getIntegrationManageCopy("instagram", {
      authFlow: "FACEBOOK_LOGIN",
    });
    expect(withFb.emptyState.checklist.join(" ")).toMatch(/Facebook Page/i);
  });

  it("labels connection method for Manage badge", () => {
    expect(getInstagramConnectionMethodLabel("INSTAGRAM_LOGIN")).toBe(
      "Connected via Instagram",
    );
    expect(getInstagramConnectionMethodLabel("FACEBOOK_LOGIN")).toBe(
      "Connected via Facebook",
    );
  });
});
