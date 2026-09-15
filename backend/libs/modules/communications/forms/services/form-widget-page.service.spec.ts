import { FormWidgetPageService } from './form-widget-page.service';

describe('FormWidgetPageService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'app.backendPublicUrl') return 'https://api.example.com';
      if (key === 'app.apiPrefix') return 'api/v1';
      return undefined;
    }),
  };

  it('renders a widget page that boots the shared embed runtime', () => {
    const service = new FormWidgetPageService(config as never);
    const html = service.renderWidgetPage('pk_test');

    expect(html).toContain('form-embed-runtime.js');
    expect(html).toContain('FormEmbed.init');
    expect(html).toContain('publicKey: "pk_test"');
    expect(html).toContain('apiBase: "https://api.example.com/api/v1"');
    expect(html).not.toContain('app.example.com');
  });
});
