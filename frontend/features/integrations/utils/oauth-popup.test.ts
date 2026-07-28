/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OAUTH_MESSAGE_TYPE,
  consumeStoredOAuthResult,
  postOAuthResultToOpener,
  settleOAuthPopupClose,
  subscribeToOAuthMessages,
} from "./oauth-popup";

describe("oauth-popup fallbacks", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        static instances: Array<{
          name: string;
          listeners: Set<(event: MessageEvent) => void>;
        }> = [];

        name: string;
        listeners = new Set<(event: MessageEvent) => void>();

        constructor(name: string) {
          this.name = name;
          (
            globalThis.BroadcastChannel as unknown as {
              instances: Array<{
                name: string;
                listeners: Set<(event: MessageEvent) => void>;
              }>;
            }
          ).instances.push(this);
        }

        addEventListener(
          type: string,
          listener: (event: MessageEvent) => void,
        ) {
          if (type === "message") this.listeners.add(listener);
        }

        removeEventListener(
          type: string,
          listener: (event: MessageEvent) => void,
        ) {
          if (type === "message") this.listeners.delete(listener);
        }

        postMessage(data: unknown) {
          const event = { data } as MessageEvent;
          for (const instance of (
            globalThis.BroadcastChannel as unknown as {
              instances: Array<{
                name: string;
                listeners: Set<(event: MessageEvent) => void>;
              }>;
            }
          ).instances) {
            if (instance.name !== this.name) continue;
            for (const listener of instance.listeners) listener(event);
          }
        }

        close() {
          this.listeners.clear();
        }
      },
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("notifies subscribers via BroadcastChannel when opener is missing", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToOAuthMessages(handler);

    postOAuthResultToOpener({
      type: OAUTH_MESSAGE_TYPE.SUCCESS,
      providerKey: "facebook",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: OAUTH_MESSAGE_TYPE.SUCCESS,
      providerKey: "facebook",
    });
    expect(localStorage.getItem("ba:oauth_popup_result")).toBeNull();

    unsubscribe();
  });

  it("dedupes duplicate success notifications", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToOAuthMessages(handler);

    const message = {
      type: OAUTH_MESSAGE_TYPE.SUCCESS,
      providerKey: "linkedin",
    } as const;
    postOAuthResultToOpener(message);
    postOAuthResultToOpener(message);

    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("consumeStoredOAuthResult returns a fresh stored payload", () => {
    localStorage.setItem(
      "ba:oauth_popup_result",
      JSON.stringify({
        type: OAUTH_MESSAGE_TYPE.SUCCESS,
        providerKey: "instagram",
        ts: Date.now(),
      }),
    );

    expect(consumeStoredOAuthResult()).toEqual({
      type: OAUTH_MESSAGE_TYPE.SUCCESS,
      providerKey: "instagram",
    });
    expect(localStorage.getItem("ba:oauth_popup_result")).toBeNull();
  });

  it("settleOAuthPopupClose treats API-connected as success", async () => {
    let completed = false;
    const handler = vi.fn(() => {
      completed = true;
    });
    const unsubscribe = subscribeToOAuthMessages(handler);

    const outcome = await settleOAuthPopupClose({
      providerKey: "instagram",
      isCompleted: () => completed,
      checkConnected: async () => true,
      timeoutMs: 5_000,
      pollMs: 10,
    });

    expect(outcome).toBe("completed");
    expect(handler).toHaveBeenCalledWith({
      type: OAUTH_MESSAGE_TYPE.SUCCESS,
      providerKey: "instagram",
    });
    unsubscribe();
  });
});
