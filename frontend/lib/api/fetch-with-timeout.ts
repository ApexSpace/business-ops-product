/** Client-side API requests (via BFF). Slightly longer than BFF→backend timeout. */
export const CLIENT_FETCH_TIMEOUT_MS = 35_000;

export class FetchTimeoutError extends Error {
  constructor() {
    super("Request timed out");
    this.name = "FetchTimeoutError";
  }
}

export class FetchNetworkError extends Error {
  constructor(cause?: unknown) {
    super("Network request failed");
    this.name = "FetchNetworkError";
    this.cause = cause;
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = CLIENT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const signal = init?.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  try {
    return await fetch(input, { ...init, signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchTimeoutError();
    }
    throw new FetchNetworkError(err);
  } finally {
    clearTimeout(timeout);
  }
}
