export const OAUTH_MESSAGE_TYPE = {
  SUCCESS: "oauth-success",
  ERROR: "oauth-error",
} as const;

export type OAuthMessageType =
  (typeof OAUTH_MESSAGE_TYPE)[keyof typeof OAUTH_MESSAGE_TYPE];

export interface OAuthSuccessMessage {
  type: typeof OAUTH_MESSAGE_TYPE.SUCCESS;
  providerKey: string;
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

function isOAuthMessage(data: unknown): data is OAuthMessage {
  if (!data || typeof data !== "object") return false;
  const message = data as { type?: string };
  return (
    message.type === OAUTH_MESSAGE_TYPE.SUCCESS ||
    message.type === OAUTH_MESSAGE_TYPE.ERROR
  );
}

export function openOAuthPopup(
  url: string,
  options?: OpenOAuthPopupOptions,
): OpenOAuthPopupResult {
  if (typeof window === "undefined") {
    return { popup: null, blocked: true };
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
    return { popup: null, blocked: true };
  }

  popup.focus();
  return { popup, blocked: false };
}

export function postOAuthResultToOpener(message: OAuthMessage): void {
  if (typeof window === "undefined" || !window.opener) return;

  window.opener.postMessage(message, window.location.origin);
}

export function subscribeToOAuthMessages(
  handler: (message: OAuthMessage) => void,
): () => void {
  const listener = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (!isOAuthMessage(event.data)) return;
    handler(event.data);
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

export function watchOAuthPopupClosed(
  popup: Window,
  onClosed: () => void,
  intervalMs = 500,
): () => void {
  const intervalId = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(intervalId);
      onClosed();
    }
  }, intervalMs);

  return () => window.clearInterval(intervalId);
}
