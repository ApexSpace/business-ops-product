import {
  normalizeUsE164Phone,
  assertUsE164Phone,
} from './us-e164-phone.util';

describe('normalizeUsE164Phone', () => {
  it('normalizes 10-digit and +1 numbers', () => {
    expect(normalizeUsE164Phone('2125551234')).toBe('+12125551234');
    expect(normalizeUsE164Phone('+1 (212) 555-1234')).toBe('+12125551234');
    expect(normalizeUsE164Phone('1-212-555-1234')).toBe('+12125551234');
  });

  it('rejects non-US lengths and invalid NANP', () => {
    expect(normalizeUsE164Phone('+441234567890')).toBeNull();
    expect(normalizeUsE164Phone('123')).toBeNull();
    expect(normalizeUsE164Phone('0551234567')).toBeNull();
  });
});

describe('assertUsE164Phone', () => {
  it('throws for invalid numbers', () => {
    expect(() => assertUsE164Phone('not-a-phone')).toThrow('INVALID_US_PHONE');
  });
});
