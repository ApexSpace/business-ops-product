import { validateYouTubePublishInput } from './youtube-validation.util';
import type { SocialPublishInput } from '../social-publish-adapter.interface';

function baseInput(
  overrides: Partial<SocialPublishInput> = {},
): SocialPublishInput {
  return {
    businessId: 'b1',
    providerKey: 'youtube',
    postType: 'VIDEO',
    caption: 'description',
    platformPayload: {
      title: 'My video',
      privacyStatus: 'public',
      madeForKids: false,
      categoryId: '22',
    },
    media: [
      {
        url: 'https://files.example.com/v.mp4',
        mimeType: 'video/mp4',
        fileAssetId: 'f1',
        sizeBytes: 1024,
        durationSec: 30,
      },
    ],
    accessToken: 'token',
    externalResourceId: 'channel-1',
    ...overrides,
  };
}

describe('validateYouTubePublishInput', () => {
  it('accepts a valid payload', () => {
    const result = validateYouTubePublishInput(baseInput());
    expect(result.valid).toBe(true);
  });

  it('requires title', () => {
    const result = validateYouTubePublishInput(
      baseInput({ platformPayload: { madeForKids: false, title: '' } }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'title')).toBe(true);
  });

  it('requires madeForKids boolean', () => {
    const result = validateYouTubePublishInput(
      baseInput({
        platformPayload: { title: 'T', privacyStatus: 'public' },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'madeForKids')).toBe(true);
  });

  it('enforces Shorts duration', () => {
    const result = validateYouTubePublishInput(
      baseInput({
        postType: 'SHORT',
        media: [
          {
            url: 'https://files.example.com/v.mp4',
            mimeType: 'video/mp4',
            fileAssetId: 'f1',
            durationSec: 90,
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'media')).toBe(true);
  });

  it('requires a channel destination', () => {
    const result = validateYouTubePublishInput(
      baseInput({
        externalResourceId: '',
        metadata: {},
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'externalResourceId')).toBe(
      true,
    );
  });

  it('accepts compose destination via integrationResourceId metadata', () => {
    const result = validateYouTubePublishInput(
      baseInput({
        externalResourceId: '',
        metadata: { integrationResourceId: 'resource-uuid' },
      }),
    );
    expect(result.valid).toBe(true);
  });
});
