import {
  extractNanpAreaCode,
  isUsPhoneCountryCode,
  resolveRequestedUsAreaCode,
} from './us-phone-area-code.util';

describe('us-phone-area-code.util', () => {
  describe('isUsPhoneCountryCode', () => {
    it.each(['+1', '1', 'US', 'USA', 'us'])('accepts %s', (code) => {
      expect(isUsPhoneCountryCode(code)).toBe(true);
    });

    it.each(['+44', '44', 'GB', null, undefined, ''])('rejects %s', (code) => {
      expect(isUsPhoneCountryCode(code)).toBe(false);
    });
  });

  describe('extractNanpAreaCode', () => {
    it('extracts from formatted national number', () => {
      expect(extractNanpAreaCode('(512) 555-0199')).toBe('512');
    });

    it('extracts from E.164', () => {
      expect(extractNanpAreaCode('+15125550199')).toBe('512');
    });

    it('returns null for non-NANP lengths', () => {
      expect(extractNanpAreaCode('5550199')).toBeNull();
      expect(extractNanpAreaCode('+442071838750')).toBeNull();
    });
  });

  describe('resolveRequestedUsAreaCode', () => {
    it('skips non-US', () => {
      expect(
        resolveRequestedUsAreaCode({
          phoneCountryCode: '+44',
          phoneNumber: '2071838750',
          defaultAreaCode: '512',
        }),
      ).toEqual({ isUs: false, areaCode: null });
    });

    it('prefers phone area code over default', () => {
      expect(
        resolveRequestedUsAreaCode({
          phoneCountryCode: '+1',
          phoneNumber: '7375550142',
          defaultAreaCode: '512',
        }),
      ).toEqual({ isUs: true, areaCode: '737' });
    });

    it('falls back to default area code when phone missing', () => {
      expect(
        resolveRequestedUsAreaCode({
          phoneCountryCode: 'US',
          phoneNumber: null,
          defaultAreaCode: '512',
        }),
      ).toEqual({ isUs: true, areaCode: '512' });
    });
  });
});
