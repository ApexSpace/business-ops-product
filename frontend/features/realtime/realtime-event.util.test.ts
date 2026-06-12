import { describe, expect, it } from "vitest";
import { isRealtimeDisabledEvent } from "./realtime-event.util";

describe("isRealtimeDisabledEvent", () => {
  it("matches realtime.disabled", () => {
    expect(
      isRealtimeDisabledEvent({
        event: "realtime.disabled",
        data: { reason: "redis_unavailable" },
      }),
    ).toBe(true);
  });

  it("ignores conversation events", () => {
    expect(
      isRealtimeDisabledEvent({
        event: "conversation.message.received",
        data: {},
      }),
    ).toBe(false);
  });
});
