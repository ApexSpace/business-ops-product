import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { OAUTH_STATE_TTL_MS } from '../constants/stripe-oauth.constants';

export interface StripeOAuthStatePayload {
  businessId: string;
  userId: string;
  providerKey: string;
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

export function createStripeOAuthState(
  payload: Omit<StripeOAuthStatePayload, 'nonce' | 'timestamp'>,
  secret: string,
): string {
  const fullPayload: StripeOAuthStatePayload = {
    ...payload,
    nonce: randomBytes(16).toString('hex'),
    timestamp: Date.now(),
  };
  const encoded = encodeBase64Url(JSON.stringify(fullPayload));
  const signature = signPayload(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyStripeOAuthState(
  state: string,
  secret: string,
): StripeOAuthStatePayload {
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

  const payload = JSON.parse(decodeBase64Url(encoded)) as StripeOAuthStatePayload;
  if (Date.now() - payload.timestamp > OAUTH_STATE_TTL_MS) {
    throw new Error('OAuth state expired');
  }

  return payload;
}
