const SECRET_CONFIG_KEYS = new Set([
  'appSecret',
  'clientSecret',
  'webhookSecret',
  'accessToken',
  'pageAccessToken',
  'refreshToken',
]);

const MASKED_VALUE = '••••••••';

export function maskSecretValue(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return MASKED_VALUE;
  if (value.length <= 4) return MASKED_VALUE;
  return `${value.slice(0, 2)}${MASKED_VALUE}${value.slice(-2)}`;
}

export function sanitizeConfigForResponse(
  config: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!config) return null;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_CONFIG_KEYS.has(key)) {
      result[key] = maskSecretValue(value);
      continue;
    }
    if (key === 'hasAppSecret' && typeof value === 'boolean') {
      result[key] = value;
      continue;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeConfigForResponse(
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

const SENSITIVE_METADATA_KEYS = new Set([
  'pageAccessToken',
  'pageAccessTokenEncrypted',
  'accessToken',
  'token',
]);

export function sanitizeResourceMetadata(
  metadata: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!metadata) return null;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEYS.has(key) && typeof value === 'string') {
      result[key] = maskSecretValue(value);
      result[`${key}Stored`] = true;
    } else {
      result[key] = value;
    }
  }
  return result;
}
