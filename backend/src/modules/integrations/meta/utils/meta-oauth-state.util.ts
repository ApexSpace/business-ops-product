import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { META_OAUTH_STATE_TTL_MS } from '../constants/meta-oauth.constants';
import {
  getMetaProviderConfig,
  isMetaProviderKey,
  resolveFlowType,
  type MetaFlowType,
  type MetaProviderKey,
} from '../constants/meta-provider.config';

export interface MetaOAuthStatePayload {
  businessId: string;
  userId: string;
  providerKey: MetaProviderKey;
  flowType: MetaFlowType;
  /** @deprecated Use flowType — kept for backward compatibility with in-flight states */
  flow?: 'oauth' | 'embedded_signup';
  nonce: string;
  timestamp: number;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payloadEncoded: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadEncoded).digest('base64url');
}

export function createMetaOAuthState(
  payload: {
    businessId: string;
    userId: string;
    providerKey: MetaProviderKey;
    flowType?: MetaFlowType;
  },
  secret: string,
): string {
  const flowType = resolveFlowType(payload.providerKey, payload.flowType);
  const fullPayload: MetaOAuthStatePayload = {
    businessId: payload.businessId,
    userId: payload.userId,
    providerKey: payload.providerKey,
    flowType,
    flow:
      flowType === 'WHATSAPP_EMBEDDED_SIGNUP' ? 'embedded_signup' : 'oauth',
    nonce: randomBytes(16).toString('hex'),
    timestamp: Date.now(),
  };
  const encoded = encodeBase64Url(JSON.stringify(fullPayload));
  const signature = signPayload(encoded, secret);
  return `${encoded}.${signature}`;
}

function normalizeLegacyPayload(
  raw: Record<string, unknown>,
): MetaOAuthStatePayload {
  const providerKey = raw.providerKey;
  if (typeof providerKey !== 'string' || !isMetaProviderKey(providerKey)) {
    throw new Error('Invalid providerKey in OAuth state');
  }

  let flowType: MetaFlowType;
  if (raw.flowType === 'META_OAUTH' || raw.flowType === 'WHATSAPP_EMBEDDED_SIGNUP') {
    flowType = resolveFlowType(providerKey, raw.flowType);
  } else if (raw.flow === 'embedded_signup') {
    flowType = 'WHATSAPP_EMBEDDED_SIGNUP';
  } else {
    flowType = META_PROVIDER_CONFIG_FALLBACK_FLOW(providerKey);
  }

  return {
    businessId: String(raw.businessId),
    userId: String(raw.userId),
    providerKey,
    flowType,
    flow:
      raw.flow === 'embedded_signup' || raw.flow === 'oauth'
        ? raw.flow
        : flowType === 'WHATSAPP_EMBEDDED_SIGNUP'
          ? 'embedded_signup'
          : 'oauth',
    nonce: String(raw.nonce),
    timestamp: Number(raw.timestamp),
  };
}

function META_PROVIDER_CONFIG_FALLBACK_FLOW(
  providerKey: MetaProviderKey,
): MetaFlowType {
  const config = getMetaProviderConfig(providerKey);
  return config?.flowType ?? 'META_OAUTH';
}

export function verifyMetaOAuthState(
  state: string,
  secret: string,
): MetaOAuthStatePayload {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) {
    throw new Error('Invalid OAuth state format');
  }

  const expected = signPayload(encoded, secret);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid OAuth state signature');
  }

  const raw = JSON.parse(decodeBase64Url(encoded)) as Record<string, unknown>;
  const payload = normalizeLegacyPayload(raw);

  if (Date.now() - payload.timestamp > META_OAUTH_STATE_TTL_MS) {
    throw new Error('OAuth state expired');
  }

  const config = getMetaProviderConfig(payload.providerKey);
  if (!config) {
    throw new Error('Unknown provider in OAuth state');
  }
  if (config.flowType !== payload.flowType) {
    throw new Error('OAuth state flowType does not match provider configuration');
  }

  return payload;
}
