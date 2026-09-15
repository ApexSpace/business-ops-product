import { isYouTubeQuotaError, YouTubeApiError } from './youtube.constants';

describe('YouTubeApiError helpers', () => {
  it('detects quota errors', () => {
    expect(
      isYouTubeQuotaError(new YouTubeApiError('quota exceeded', 'quotaExceeded')),
    ).toBe(true);
    expect(
      isYouTubeQuotaError(new YouTubeApiError('rateLimitExceeded', 'other')),
    ).toBe(true);
    expect(isYouTubeQuotaError(new YouTubeApiError('bad request', 'invalid'))).toBe(
      false,
    );
    expect(isYouTubeQuotaError(new Error('nope'))).toBe(false);
  });
});
