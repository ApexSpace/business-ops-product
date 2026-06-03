import { createHmac } from 'crypto';
import { verifyMetaWebhookSignature } from './meta-webhook-signature.util';

describe('verifyMetaWebhookSignature', () => {
  const secret = 'test-app-secret';
  const body = Buffer.from('{"object":"page"}');

  function sign(payload: Buffer): string {
    const digest = createHmac('sha256', secret).update(payload).digest('hex');
    return `sha256=${digest}`;
  }

  it('accepts valid signature', () => {
    expect(verifyMetaWebhookSignature(body, sign(body), secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(
      verifyMetaWebhookSignature(body, 'sha256=deadbeef', secret),
    ).toBe(false);
  });

  it('rejects missing header', () => {
    expect(verifyMetaWebhookSignature(body, undefined, secret)).toBe(false);
  });
});
