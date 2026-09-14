import {
  amountToCents,
  buildStripeCollectIdempotencyKey,
} from './stripe-collect-idempotency.util';

describe('buildStripeCollectIdempotencyKey', () => {
  it('uses close:{checkoutId}:{amountCents} for a given payable and amount', () => {
    expect(buildStripeCollectIdempotencyKey('chk-1', 5000)).toBe(
      'close:chk-1:5000',
    );
  });

  it('appends a disambiguator when replacing a canceled PI', () => {
    expect(buildStripeCollectIdempotencyKey('chk-1', 5000, 'pay-9')).toBe(
      'close:chk-1:5000:pay-9',
    );
  });

  it('converts decimal amounts to cents without float drift', () => {
    expect(amountToCents('50.00')).toBe(5000);
    expect(amountToCents(12.34)).toBe(1234);
  });
});
