import { validateTikTokPublishInput } from './tiktok-validation.util';
import type { SocialPublishInput } from '../social-publish-adapter.interface';

function baseInput(
  overrides: Partial<SocialPublishInput> = {},
): SocialPublishInput {
  return {
    businessId: 'b1',
    providerKey: 'tiktok',
    postType: 'VIDEO',
    caption: 'hello',
    platformPayload: { privacyLevel: 'SELF_ONLY' },
    media: [
      {
        url: 'https://files.example.com/v.mp4',
        mimeType: 'video/mp4',
        fileAssetId: 'f1',
        isPublicUrl: true,
      },
    ],
    accessToken: 'token',
    externalResourceId: 'open-id',
    ...overrides,
  };
}

describe('validateTikTokPublishInput', () => {
  it('requires privacy level', () => {
    const result = validateTikTokPublishInput(
      baseInput({ platformPayload: {} }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'privacyLevel')).toBe(true);
  });

  it('rejects branded content with SELF_ONLY', () => {
    const result = validateTikTokPublishInput(
      baseInput({
        platformPayload: {
          privacyLevel: 'SELF_ONLY',
          commercialDisclosure: true,
          brandedContent: true,
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'brandedContent')).toBe(true);
  });

  it('requires disclosure options when commercial toggle is on', () => {
    const result = validateTikTokPublishInput(
      baseInput({
        platformPayload: {
          privacyLevel: 'PUBLIC_TO_EVERYONE',
          commercialDisclosure: true,
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'commercialDisclosure')).toBe(
      true,
    );
  });

  it('enforces privacy allowlist from creator_info', () => {
    const result = validateTikTokPublishInput(
      baseInput({
        platformPayload: { privacyLevel: 'PUBLIC_TO_EVERYONE' },
      }),
      { privacyLevelOptions: ['SELF_ONLY'] },
    );
    expect(result.valid).toBe(false);
  });

  it('accepts a valid private post', () => {
    const result = validateTikTokPublishInput(
      baseInput(),
      { privacyLevelOptions: ['SELF_ONLY', 'MUTUAL_FOLLOW_FRIENDS'] },
    );
    expect(result.valid).toBe(true);
  });

  it('enforces max duration when known', () => {
    const result = validateTikTokPublishInput(
      baseInput({
        media: [
          {
            url: 'https://files.example.com/v.mp4',
            mimeType: 'video/mp4',
            fileAssetId: 'f1',
            durationSec: 400,
          },
        ],
      }),
      { maxDurationSec: 300 },
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'media')).toBe(true);
  });
});
