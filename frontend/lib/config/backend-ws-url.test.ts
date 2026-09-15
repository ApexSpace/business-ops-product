import { afterEach, describe, expect, it, vi } from "vitest";

describe("getBackendWebSocketUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns explicit NEXT_PUBLIC_BACKEND_WS_URL when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_WS_URL", "wss://api.example.com/");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://ignored.example.com");
    const { getBackendWebSocketUrl } = await import("./backend-ws-url");
    expect(getBackendWebSocketUrl()).toBe("wss://api.example.com");
  });

  it("derives wss from https NEXT_PUBLIC_BACKEND_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_WS_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://api.example.com");
    const { getBackendWebSocketUrl } = await import("./backend-ws-url");
    expect(getBackendWebSocketUrl()).toBe("wss://api.example.com");
  });

  it("derives ws from http NEXT_PUBLIC_BACKEND_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_WS_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000");
    const { getBackendWebSocketUrl } = await import("./backend-ws-url");
    expect(getBackendWebSocketUrl()).toBe("ws://localhost:3000");
  });

  it("returns null when no backend URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_WS_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "");
    const { getBackendWebSocketUrl } = await import("./backend-ws-url");
    expect(getBackendWebSocketUrl()).toBeNull();
  });
});
