import { isChatbotDomainAllowed } from './chatbot-domain-allowlist.util';

describe('chatbot-domain-allowlist.util', () => {
  it('allows all domains when allowlist is empty', () => {
    expect(isChatbotDomainAllowed([], 'https://example.com/page')).toBe(true);
  });

  it('matches exact hostnames', () => {
    expect(
      isChatbotDomainAllowed(['example.com'], 'https://example.com/contact'),
    ).toBe(true);
    expect(
      isChatbotDomainAllowed(['example.com'], 'https://other.com/contact'),
    ).toBe(false);
  });

  it('matches subdomains', () => {
    expect(
      isChatbotDomainAllowed(
        ['example.com'],
        'https://www.example.com/contact',
      ),
    ).toBe(true);
  });
});
