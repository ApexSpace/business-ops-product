import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, CONTEXTS_COOKIE } from "@/lib/auth/cookies";
import { proxy } from "./proxy";

function makeAccessToken(context: "business" | "platform" = "business"): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      context,
      businessId: "biz-1",
      businessRole: "OWNER",
    }),
  ).toString("base64url");
  return `${header}.${payload}.`;
}

function requestFor(
  path: string,
  cookies?: Record<string, string>,
): NextRequest {
  const url = new URL(path, "http://localhost:3001");
  const request = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies ?? {})) {
    request.cookies.set(name, value);
  }
  return request;
}

describe("proxy returnUrl preservation", () => {
  it("redirects unauthenticated protected routes to login with returnUrl", () => {
    const billingPath =
      "/business/settings/billing?subscribePlanGroupId=pg-1&subscribePlanTierId=tier-1&billingCycle=MONTHLY";
    const response = proxy(requestFor(billingPath));
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login?returnUrl=");
    expect(location).toContain(
      encodeURIComponent(billingPath),
    );
  });

  it("redirects authenticated /login to returnUrl when provided", () => {
    const returnPath =
      "/business/settings/billing?subscribePlanGroupId=pg-1&subscribePlanTierId=tier-1";
    const response = proxy(
      requestFor(`/login?returnUrl=${encodeURIComponent(returnPath)}`, {
        [ACCESS_TOKEN_COOKIE]: makeAccessToken(),
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost:3001${returnPath}`,
    );
  });

  it("redirects authenticated /select-context with single context to returnUrl", () => {
    const returnPath = "/business/settings/billing?subscribePlanTierId=tier-1";
    const response = proxy(
      requestFor(
        `/select-context?returnUrl=${encodeURIComponent(returnPath)}`,
        {
          [ACCESS_TOKEN_COOKIE]: makeAccessToken(),
          [CONTEXTS_COOKIE]: JSON.stringify([
            { type: "business", businessId: "biz-1", businessRole: "OWNER" },
          ]),
        },
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost:3001${returnPath}`,
    );
  });
});
