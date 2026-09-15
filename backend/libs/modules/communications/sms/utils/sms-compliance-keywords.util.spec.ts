import { parseSmsComplianceKeyword } from './sms-compliance-keywords.util';

describe('parseSmsComplianceKeyword', () => {
  it('matches opt-out keywords', () => {
    expect(parseSmsComplianceKeyword(' stop ')).toBe('opt_out');
    expect(parseSmsComplianceKeyword('UNSUBSCRIBE')).toBe('opt_out');
  });

  it('matches opt-in keywords', () => {
    expect(parseSmsComplianceKeyword('start')).toBe('opt_in');
    expect(parseSmsComplianceKeyword('UNSTOP')).toBe('opt_in');
  });

  it('matches help keywords', () => {
    expect(parseSmsComplianceKeyword('help')).toBe('help');
    expect(parseSmsComplianceKeyword('INFO')).toBe('help');
  });

  it('returns null for normal replies', () => {
    expect(parseSmsComplianceKeyword('Thanks!')).toBeNull();
    expect(parseSmsComplianceKeyword('')).toBeNull();
  });
});
