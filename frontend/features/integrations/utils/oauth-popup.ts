export const OAUTH_MESSAGE_TYPE = {
  SUCCESS: "oauth-success",
  ERROR: "oauth-error",
} as const;

export type OAuthMessageType =
  (typeof OAUTH_MESSAGE_TYPE)[keyof typeof OAUTH_MESSAGE_TYPE];

export interface OAuthSuccessMessage {
  type: typeof OAUTH_MESSAGE_TYPE.SUCCESS;
  providerKey: string;
  /** Backend warning code (e.g. no_instagram_resources) */
  warning?: string;
  /** Async Meta resource sync job from OAuth callback */
  jobId?: string;
}

export interface OAuthErrorMessage {
  type: typeof OAUTH_MESSAGE_TYPE.ERROR;
  providerKey?: string;
  message: string;
}

export type OAuthMessage = OAuthSuccessMessage | OAuthErrorMessage;

export interface OpenOAuthPopupOptions {
  width?: number;
  height?: number;
  windowName?: string;
}

export interface OpenOAuthPopupResult {
  popup: Window | null;
  blocked: boolean;
}

const DEFAULT_WIDTH = 650;
const DEFAULT_HEIGHT = 750;

/** Survives Meta OAuth when Cross-Origin-Opener-Policy nulls `window.opener`. */
const OAUTH_RESULT_STORAGE_KEY = "ba:oauth_popup_result";
const OAUTH_BROADCAST_CHANNEL = "ba:oauth_popup_result";
const RESULT_MAX_AGE_MS = 60_000;
const DEDUPE_WINDOW_MS = 5_000;
/**
 * Meta sets COOP on facebook.com, so `popup.closed` often becomes true while the
 * user is still authenticating. Wait before treating close as cancel.
 */
const POPUP_CLOSE_GRACE_MS = 750;
const OAUTH_SETTLE_TIMEOUT_MS = 120_000;
const OAUTH_SETTLE_POLL_MS = 2_000;

type StoredOAuthResult = OAuthMessage & { ts: number };

const oauthListeners = new Set<(message: OAuthMessage) => void>();
const recentlyDelivered = new Map<string, number>();

function isOAuthMessage(data: unknown): data is OAuthMessage {
  if (!data || typeof data !== "object") return false;
  const message = data as { type?: string,
};
  return (
    message.type === OAUTH_MESSAGE_TYPE.SUCCESS ||
    message.type === OAUTH_MESSAGE_TYPE.ERROR
  );
}

function oauthMessageKey(message: OAuthMessage): string {
  if (message.type === OAUTH_MESSAGE_TYPE.SUCCESS) {
    return `success:${message.providerKey}:${message.warning ?? ""}:${message.jobId ?? ""}`;
  }
  return `error:${message.providerKey ?? ""}:${message.message}`;
}

function shouldDeliver(message: OAuthMessage): boolean {
  const key = oauthMessageKey(message);
  const now = Date.now();
  const previous = recentlyDelivered.get(key);
  if (previous != null && now - previous < DEDUPE_WINDOW_MS) {
    return false;
  }
  recentlyDelivered.set(key, now);
  for (const [seenKey, seenAt] of recentlyDelivered) {
    if (now - seenAt >= DEDUPE_WINDOW_MS) {
      recentlyDelivered.delete(seenKey);
    }
  }
  return true;
}

function clearStoredOAuthResult(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OAUTH_RESULT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function deliverOAuthMessage(message: OAuthMessage): void {
  if (!shouldDeliver(message)) return;
  clearStoredOAuthResult();
  for (const listener of oauthListeners) {
    listener(message);
  }
}

function parseStoredOAuthResult(raw: string): OAuthMessage | null {
  try {
    const parsed = JSON.parse(raw) as StoredOAuthResult;
    if (!isOAuthMessage(parsed)) return null;
    if (
      typeof parsed.ts !== "number" ||
      Date.now() - parsed.ts > RESULT_MAX_AGE_MS
    ) {
      return null;
    }
    if (parsed.type === OAUTH_MESSAGE_TYPE.SUCCESS) {
      return {
        type: parsed.type,
        providerKey: parsed.providerKey,
        ...(parsed.warning ? { warning: parsed.warning } : {}),
        ...("jobId" in parsed && typeof (parsed as { jobId?: string }).jobId === "string"
          ? { jobId: (parsed as { jobId: string }).jobId,
}
          : {}),
      };
    }
    return {
      type: parsed.type,
      message: parsed.message,
      ...(parsed.providerKey ? { providerKey: parsed.providerKey } : {}),
    };
  } catch {
    return null;
  }
}

function flushPendingOAuthResult(): void {
  const pending = consumeStoredOAuthResult();
  if (pending) {
    deliverOAuthMessage(pending);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Read + clear a pending result written by the OAuth callback popup. */
export function consumeStoredOAuthResult(): OAuthMessage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OAUTH_RESULT_STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(OAUTH_RESULT_STORAGE_KEY);
    return parseStoredOAuthResult(raw);
  } catch {
    return null;
  }
}

export function openOAuthPopup(
  url: string,
  options?: OpenOAuthPopupOptions,
): OpenOAuthPopupResult {
  if (typeof window === "undefined") {
    return { popup: null, blocked: true,
};
  }

  const width = options?.width ?? DEFAULT_WIDTH;
  const height = options?.height ?? DEFAULT_HEIGHT;
  const left = Math.max(
    0,
    window.screenX + (window.outerWidth - width) / 2,
  );
  const top = Math.max(
    0,
    window.screenY + (window.outerHeight - height) / 2,
  );

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "scrollbars=yes",
    "resizable=yes",
  ].join(",");

  const popup = window.open(
    url,
    options?.windowName ?? "oauth_popup",
    features,
  );

  if (!popup) {
    return { popup: null, blocked: true,
};
  }

  popup.focus();
  return { popup, blocked: false,
};
}

/**
 * Notify the opener of OAuth completion.
 * Uses postMessage when `opener` is intact, plus BroadcastChannel and
 * localStorage so Meta's COOP-isolated redirects still update the parent UI.
 */
export function postOAuthResultToOpener(message: OAuthMessage): void {
  if (typeof window === "undefined") return;

  const stored: StoredOAuthResult = { ...message, ts: Date.now(),
};

  try {
    localStorage.setItem(OAUTH_RESULT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Private mode / quota — BroadcastChannel + postMessage may still work.
  }

  try {
    const channel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Unsupported or restricted environment.
  }

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(message, window.location.origin);
    } catch {
      // Opener may be cross-origin or already detached.
    }
  }
}

export function subscribeToOAuthMessages(
  handler: (message: OAuthMessage) => void,
): () => void {
  oauthListeners.add(handler);

  const onWindowMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (!isOAuthMessage(event.data)) return;
    deliverOAuthMessage(event.data);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== OAUTH_RESULT_STORAGE_KEY || !event.newValue) return;
    const message = parseStoredOAuthResult(event.newValue);
    if (!message) return;
    deliverOAuthMessage(message);
  };

  let channel: BroadcastChannel | null = null;
  const onBroadcast = (event: MessageEvent) => {
    if (!isOAuthMessage(event.data)) return;
    deliverOAuthMessage(event.data);
  };

  window.addEventListener("message", onWindowMessage);
  window.addEventListener("storage", onStorage);

  try {
    channel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
    channel.addEventListener("message", onBroadcast);
  } catch {
    channel = null;
  }

  return () => {
    oauthListeners.delete(handler);
    window.removeEventListener("message", onWindowMessage);
    window.removeEventListener("storage", onStorage);
    if (channel) {
      channel.removeEventListener("message", onBroadcast);
      channel.close();
    }
  };
}

/**
 * After the popup reference is lost (often a Meta COOP false close), wait for a
 * real OAuth result or a confirmed connected status before calling it cancelled.
 */
export async function settleOAuthPopupClose(options: {
  providerKey: string;
  isCompleted: () => boolean;
  checkConnected: () => Promise<boolean>;
  timeoutMs?: number;
  pollMs?: number;
}): Promise<"completed" | "cancelled"> {
  const timeoutMs = options.timeoutMs ?? OAUTH_SETTLE_TIMEOUT_MS;
  const pollMs = options.pollMs ?? OAUTH_SETTLE_POLL_MS;
  const deadline = Date.now() + timeoutMs;

  flushPendingOAuthResult();
  if (options.isCompleted()) return "completed";

  while (Date.now() < deadline) {
    await sleep(pollMs);
    if (options.isCompleted()) return "completed";

    flushPendingOAuthResult();
    if (options.isCompleted()) return "completed";

    try {
      if (await options.checkConnected()) {
        if (!options.isCompleted()) {
          deliverOAuthMessage({
            type: OAUTH_MESSAGE_TYPE.SUCCESS,
            providerKey: options.providerKey,
          });
        }
        return "completed";
      }
    } catch {
      // Transient fetch failure — keep waiting for callback / retry.
    }
  }

  return options.isCompleted() ? "completed" : "cancelled";
}

export function watchOAuthPopupClosed(
  popup: Window,
  onClosed: () => void | Promise<void>,
  intervalMs = 500,
): () => void {
  let graceTimer: number | undefined;
  let consecutiveClosed = 0;
  const requiredClosedPolls = 2;

  const intervalId = window.setInterval(() => {
    let closed = false;
    try {
      closed = popup.closed;
    } catch {
      // Cross-origin / detached proxy — keep waiting.
      closed = false;
    }

    if (!closed) {
      consecutiveClosed = 0;
      return;
    }

    consecutiveClosed += 1;
    if (consecutiveClosed < requiredClosedPolls) return;

    window.clearInterval(intervalId);

    graceTimer = window.setTimeout(() => {
      void Promise.resolve(onClosed());
    }, POPUP_CLOSE_GRACE_MS);
  }, intervalMs);

  return () => {
    window.clearInterval(intervalId);
    if (graceTimer != null) {
      window.clearTimeout(graceTimer);
    }
  };
}
