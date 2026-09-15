const PIN_PATTERN = /^\d{4}$/;

export function assertValidPinFormat(pin: string): void {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error('PIN must be exactly 4 numeric digits');
  }
}

export function isValidPinFormat(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}
