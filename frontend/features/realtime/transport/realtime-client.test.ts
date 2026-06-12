import { afterEach, describe, expect, it, vi } from "vitest";

describe("RealtimeClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses SSE when only realtimeSse is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SSE", "true");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_WEBSOCKET", "false");
    vi.stubEnv("NEXT_PUBLIC_REALTIME_TRANSPORT", "auto");

    class MockEventSource {
      static last: MockEventSource | null = null;
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(
        public url: string,
        public options?: EventSourceInit,
      ) {
        MockEventSource.last = this;
        queueMicrotask(() => this.onopen?.());
      }
      close() {}
    }

    vi.stubGlobal("EventSource", MockEventSource);

    const { RealtimeClient } = await import("./realtime-client");
    const client = new RealtimeClient({
      businessId: "biz-1",
      onEvent: () => undefined,
    });

    client.connect();
    expect(MockEventSource.last?.url).toContain("businessId=biz-1");
    client.close();
  });

  it("enters polling-only when no realtime flags are enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SSE", "false");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_WEBSOCKET", "false");

    const unavailable = vi.fn();
    const { RealtimeClient } = await import("./realtime-client");
    const client = new RealtimeClient({
      businessId: "biz-1",
      onEvent: () => undefined,
      onUnavailable: unavailable,
    });

    client.connect();
    expect(client.getMode()).toBe("polling-only");
    expect(unavailable).toHaveBeenCalled();
    client.close();
  });
});
