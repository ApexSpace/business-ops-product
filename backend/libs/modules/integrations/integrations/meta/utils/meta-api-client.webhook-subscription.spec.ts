import { MetaApiClient } from '@app/modules/integrations/integrations/meta/services/meta-api-client';
import { MetaConfigService } from '@app/modules/integrations/integrations/meta/services/meta-config.service';

describe('MetaApiClient webhook subscriptions', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function createClient() {
    const metaConfigService = {
      getMetaAppConfig: () => ({
        appId: 'app-1',
        appSecret: 'secret-1',
        webhookVerifyToken: 'verify-token',
        loginConfigId: null,
        facebookLoginConfigId: null,
        instagramLoginConfigId: null,
        embeddedSignupConfigId: null,
        graphApiVersion: 'v20.0',
      }),
      getMetaWebhookCallbackUrl: () =>
        'https://api.example.com/api/v1/webhooks/meta',
    } as MetaConfigService;

    return new MetaApiClient(metaConfigService);
  }

  it('subscribes a Page to messaging webhooks', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as typeof fetch;

    const client = createClient();
    const success = await client.subscribePageToMessagingWebhooks(
      'page-1',
      'page-token',
    );

    expect(success).toBe(true);
    const calledUrl = (fetchMock.mock.calls[0][0] as string).toString();
    expect(calledUrl).toContain('/page-1/subscribed_apps');
    expect(calledUrl).toContain('subscribed_fields=messages');
    expect(calledUrl).toContain('feed');
    expect(calledUrl).toContain('access_token=page-token');
  });

  it('subscribes the app to Instagram webhook fields', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as typeof fetch;

    const client = createClient();
    const success = await client.ensureAppWebhookSubscription('instagram');

    expect(success).toBe(true);
    const calledUrl = (fetchMock.mock.calls[0][0] as string).toString();
    expect(calledUrl).toContain('/app-1/subscriptions');
    expect(calledUrl).toContain('object=instagram');
    expect(calledUrl).toContain('callback_url=');
    expect(calledUrl).toContain('verify_token=verify-token');
    expect(calledUrl).toContain('fields=messages');
    expect(calledUrl).toContain('comments');
  });
});
