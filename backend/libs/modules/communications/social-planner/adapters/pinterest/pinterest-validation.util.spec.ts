import { validatePinterestPublishInput } from './pinterest-validation.util';
import {
  PINTEREST_IMAGE_MAX_BYTES,
  PINTEREST_TITLE_MAX_LENGTH,
} from './pinterest.constants';
import type { SocialPublishInput } from '../social-publish-adapter.interface';

function baseInput(
  overrides: Partial<SocialPublishInput> = {},
): SocialPublishInput {
  return {
    businessId: 'b1',
    providerKey: 'pinterest',
    postType: 'PIN',
    accessToken: 'token',
    caption: 'Pin description',
    media: [
      {
        url: 'https://cdn.example.com/pin.jpg',
        mimeType: 'image/jpeg',
        fileAssetId: 'f1',
        sizeBytes: 1024,
      },
    ],
    platformPayload: {
      title: 'My pin',
    },
    externalResourceId: 'board-123',
    ...overrides,
  };
}

describe('validatePinterestPublishInput', () => {
  it('passes a valid image pin', () => {
    const result = validatePinterestPublishInput(baseInput());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('requires title', () => {
    const result = validatePinterestPublishInput(
      baseInput({ platformPayload: { title: '' } }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'title')).toBe(true);
  });

  it('requires a board destination', () => {
    const result = validatePinterestPublishInput(
      baseInput({
        externalResourceId: undefined,
        platformPayload: { title: 'T' },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'externalResourceId')).toBe(
      true,
    );
  });

  it('rejects oversized images', () => {
    const result = validatePinterestPublishInput(
      baseInput({
        media: [
          {
            url: 'https://cdn.example.com/big.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: PINTEREST_IMAGE_MAX_BYTES + 1,
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'media')).toBe(true);
  });

  it('rejects invalid destination links', () => {
    const result = validatePinterestPublishInput(
      baseInput({
        platformPayload: { title: 'T', link: 'not-a-url' },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'link')).toBe(true);
  });

  it('accepts a valid video pin', () => {
    const result = validatePinterestPublishInput(
      baseInput({
        media: [
          {
            url: 'https://cdn.example.com/pin.mp4',
            mimeType: 'video/mp4',
            sizeBytes: 5_000_000,
            durationSec: 15,
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it('rejects videos shorter than 4 seconds', () => {
    const result = validatePinterestPublishInput(
      baseInput({
        media: [
          {
            url: 'https://cdn.example.com/pin.mp4',
            mimeType: 'video/mp4',
            sizeBytes: 1_000_000,
            durationSec: 2,
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
  });

  it(`rejects titles longer than ${PINTEREST_TITLE_MAX_LENGTH}`, () => {
    const result = validatePinterestPublishInput(
      baseInput({
        platformPayload: {
          title: 'x'.repeat(PINTEREST_TITLE_MAX_LENGTH + 1),
        },
      }),
    );
    expect(result.valid).toBe(false);
  });
});
