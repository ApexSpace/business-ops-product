const SYNC_COOLDOWN_MS: Record<string, number> = {
  'google-business-profile': 60_000,
  'google-calendar': 15_000,
};

const DEFAULT_SYNC_COOLDOWN_MS = 30_000;

const lastSyncAt = new Map<string, number>();

function syncKey(businessId: string, providerKey: string): string {
  return `${businessId}:${providerKey}`;
}

export function getSyncCooldownMs(providerKey: string): number {
  return SYNC_COOLDOWN_MS[providerKey] ?? DEFAULT_SYNC_COOLDOWN_MS;
}

export function getSyncCooldownRemainingMs(
  businessId: string,
  providerKey: string,
): number {
  const last = lastSyncAt.get(syncKey(businessId, providerKey));
  if (!last) return 0;
  const remaining = getSyncCooldownMs(providerKey) - (Date.now() - last);
  return remaining > 0 ? remaining : 0;
}

export function assertSyncAllowed(
  businessId: string,
  providerKey: string,
): void {
  const remaining = getSyncCooldownRemainingMs(businessId, providerKey);
  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);
    throw new SyncCooldownError(
      `Please wait ${seconds} second${seconds === 1 ? '' : 's'} before syncing again. Google Business Profile APIs have strict rate limits.`,
      remaining,
    );
  }
}

export function recordSyncAttempt(
  businessId: string,
  providerKey: string,
): void {
  lastSyncAt.set(syncKey(businessId, providerKey), Date.now());
}

export class SyncCooldownError extends Error {
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'SyncCooldownError';
    this.retryAfterMs = retryAfterMs;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
