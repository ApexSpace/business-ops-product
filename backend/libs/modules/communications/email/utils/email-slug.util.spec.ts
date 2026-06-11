import { buildPlatformFromAddress, slugifyBusinessName } from './email-slug.util';

describe('email-slug.util', () => {
  it('slugifies business names', () => {
    expect(slugifyBusinessName('Acme Plumbing & Heating')).toBe('acmeplumbingheating');
  });

  it('builds platform from address', () => {
    expect(buildPlatformFromAddress('acmeplumbing', 'notify.codesoltech.com')).toBe(
      'acmeplumbing@notify.codesoltech.com',
    );
  });
});
