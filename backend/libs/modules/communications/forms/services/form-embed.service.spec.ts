import { FormStatus } from '@prisma/client';
import { FormEmbedService } from './form-embed.service';

describe('FormEmbedService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'app.backendPublicUrl') return 'https://api.example.com';
      if (key === 'app.frontendUrl') return 'https://app.example.com';
      return undefined;
    }),
  };

  function buildService() {
    return new FormEmbedService(config as never);
  }

  it('builds embed URLs and snippets for a published form', () => {
    const service = buildService();
    const result = service.buildEmbed({
      publicKey: 'pk_test',
      slug: 'contact',
      status: FormStatus.PUBLISHED,
    });

    expect(result.publicKey).toBe('pk_test');
    expect(result.slug).toBe('contact');
    expect(result.isPublished).toBe(true);
    expect(result.scriptUrl).toBe('https://api.example.com/widgets/form.js');
    expect(result.iframeUrl).toBe(
      'https://api.example.com/widgets/form/pk_test',
    );
    expect(result.hostedPageUrl).toBe(
      'https://app.example.com/widget/form/pk_test',
    );
    expect(result.embedCode).toContain('widgets/form.js');
    expect(result.embedCode).toContain('widgets/form/pk_test');
    expect(result.embedCode).toContain('class="form-embed-widget"');
    expect(result.iframeEmbed).toContain(result.iframeUrl);
  });

  it('marks draft forms as not published in embed response', () => {
    const service = buildService();
    const result = service.buildEmbed({
      publicKey: 'pk_draft',
      slug: null,
      status: FormStatus.DRAFT,
    });

    expect(result.isPublished).toBe(false);
  });
});
