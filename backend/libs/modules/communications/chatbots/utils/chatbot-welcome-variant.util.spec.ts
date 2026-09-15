import { describe, expect, it } from '@jest/globals';
import { resolveWelcomeMessage } from './chatbot-welcome-variant.util';

describe('chatbot-welcome-variant.util', () => {
  it('returns default when no variants match', () => {
    expect(
      resolveWelcomeMessage(
        'Hello',
        [
          {
            matchType: 'page_url',
            pattern: '/pricing',
            message: 'Pricing help',
          },
        ],
        {
          pageUrl: 'https://example.com/contact',
        },
      ),
    ).toBe('Hello');
  });

  it('matches page URL contains pattern', () => {
    expect(
      resolveWelcomeMessage(
        'Hello',
        [
          {
            matchType: 'page_url',
            pattern: '/pricing',
            message: 'Pricing help',
          },
        ],
        {
          pageUrl: 'https://example.com/pricing/plans',
        },
      ),
    ).toBe('Pricing help');
  });

  it('matches referrer wildcard pattern', () => {
    expect(
      resolveWelcomeMessage(
        'Hello',
        [
          {
            matchType: 'referrer',
            pattern: '*google*',
            message: 'Welcome from Google',
          },
        ],
        {
          referrer: 'https://www.google.com/search?q=dental',
        },
      ),
    ).toBe('Welcome from Google');
  });
});
