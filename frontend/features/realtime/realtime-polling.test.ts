import { afterEach, describe, expect, it, vi } from "vitest";
import { getRealtimePollIntervalMs } from "./realtime-polling";

describe("realtime-polling", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("detects when any realtime transport flag is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_WEBSOCKET", "true");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SSE", "false");
    vi.resetModules();
    const { isAnyRealtimeTransportEnabled } = await import("./realtime-polling");
    expect(isAnyRealtimeTransportEnabled()).toBe(true);
  });

  it("uses slower polling when websocket or sse is active", () => {
    expect(getRealtimePollIntervalMs("websocket")).toBe(30_000);
    expect(getRealtimePollIntervalMs("sse")).toBe(30_000);
    expect(getRealtimePollIntervalMs("polling-only")).toBe(5_000);
  });
});
