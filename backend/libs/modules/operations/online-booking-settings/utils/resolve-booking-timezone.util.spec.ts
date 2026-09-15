import { resolveBookingTimezone } from './resolve-booking-timezone.util';

describe('resolveBookingTimezone', () => {
  it('always prefers the business profile timezone', () => {
    expect(
      resolveBookingTimezone('America/Los_Angeles', 'Asia/Karachi'),
    ).toBe('Asia/Karachi');
  });

  it('ignores online booking settings timezone when business timezone is set', () => {
    expect(resolveBookingTimezone('Europe/London', 'America/New_York')).toBe(
      'America/New_York',
    );
  });

  it('falls back to UTC when business timezone is missing', () => {
    expect(resolveBookingTimezone('Asia/Karachi', null)).toBe('UTC');
    expect(resolveBookingTimezone('Asia/Karachi', undefined)).toBe('UTC');
  });
});
