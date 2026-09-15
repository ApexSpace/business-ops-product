import { describe, expect, it } from "vitest";
import {
  PUBLIC_ESTIMATE_SENT_STATUS_HINT,
  PUBLIC_ESTIMATE_STAFF_NOTICE,
  PUBLIC_ESTIMATE_UNAVAILABLE_BODY,
  PUBLIC_ESTIMATE_UNAVAILABLE_TITLE,
} from "@/features/estimates/public-estimate-launch";

describe("public estimate launch waive (C-P0-01)", () => {
  it("does not present the public page as a working product", () => {
    expect(PUBLIC_ESTIMATE_UNAVAILABLE_TITLE).toMatch(/unavailable/i);
    expect(PUBLIC_ESTIMATE_UNAVAILABLE_BODY).toMatch(/not available/i);
    expect(PUBLIC_ESTIMATE_UNAVAILABLE_BODY).not.toMatch(/not found|expired/i);
  });

  it("tells staff not to send clients a public estimate link", () => {
    expect(PUBLIC_ESTIMATE_STAFF_NOTICE).toMatch(/cannot view or accept/i);
    expect(PUBLIC_ESTIMATE_SENT_STATUS_HINT).toMatch(/does not email/i);
  });
});
