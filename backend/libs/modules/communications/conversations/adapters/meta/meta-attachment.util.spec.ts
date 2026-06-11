import {
  normalizeMetaInboundAttachments,
  previewFromMessageContent,
  toMetaOutboundAttachments,
} from './meta-attachment.util';

describe('meta-attachment.util', () => {
  it('normalizes inbound image attachments with URLs', () => {
    const result = normalizeMetaInboundAttachments([
      {
        type: 'image',
        payload: { url: 'https://example.com/photo.jpg' },
      },
    ]);

    expect(result).toEqual([
      { type: 'image', url: 'https://example.com/photo.jpg', title: null },
    ]);
  });

  it('maps outbound attachments for Graph API send', () => {
    const result = toMetaOutboundAttachments([
      { type: 'image', url: 'https://example.com/photo.jpg' },
      { type: 'invalid', url: 'https://example.com/file.bin' },
    ]);

    expect(result).toEqual([
      { type: 'image', url: 'https://example.com/photo.jpg' },
    ]);
  });

  it('builds attachment preview when text is missing', () => {
    expect(
      previewFromMessageContent(null, [{ type: 'image' }]),
    ).toBe('[Image]');
  });
});
