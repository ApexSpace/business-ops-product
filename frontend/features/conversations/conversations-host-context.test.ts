import { describe, expect, it } from "vitest";
import {
  BUSINESS_CONVERSATIONS_HOST,
  PLATFORM_CONVERSATIONS_HOST,
} from "@/features/conversations/conversations-host-context";

describe("conversations host context", () => {
  it("points platform mode at platform conversation APIs", () => {
    expect(PLATFORM_CONVERSATIONS_HOST.mode).toBe("platform");
    expect(PLATFORM_CONVERSATIONS_HOST.apiBase).toBe("platform/conversations");
    expect(PLATFORM_CONVERSATIONS_HOST.contactsApiBase).toBe(
      "platform/contacts",
    );
    expect(PLATFORM_CONVERSATIONS_HOST.cannedApiBase).toBe(
      "platform/canned-responses",
    );
    expect(PLATFORM_CONVERSATIONS_HOST.basePath).toBe("/platform/conversations");
  });

  it("keeps business mode on tenant conversation APIs", () => {
    expect(BUSINESS_CONVERSATIONS_HOST.mode).toBe("business");
    expect(BUSINESS_CONVERSATIONS_HOST.apiBase).toBe("conversations");
    expect(BUSINESS_CONVERSATIONS_HOST.contactsApiBase).toBe("contacts");
  });
});
