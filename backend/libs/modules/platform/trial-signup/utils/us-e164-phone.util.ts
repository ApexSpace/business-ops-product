/**
 * Strict US (+1) E.164 helpers for trial signup OTP.
 */

export function normalizeUsE164Phone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let national = digits;
  if (digits.length === 11 && digits.startsWith('1')) {
    national = digits.slice(1);
  }
  if (digits.length === 10) {
    national = digits;
  }
  if (national.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return `+1${national}`;
}

export function assertUsE164Phone(raw: string): string {
  const normalized = normalizeUsE164Phone(raw);
  if (!normalized) {
    throw new Error('INVALID_US_PHONE');
  }
  return normalized;
}
