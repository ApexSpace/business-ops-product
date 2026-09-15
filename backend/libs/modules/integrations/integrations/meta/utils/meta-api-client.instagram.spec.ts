import { MetaApiClient } from '@app/modules/integrations/integrations/meta/services/meta-api-client';
import { MetaConfigService } from '@app/modules/integrations/integrations/meta/services/meta-config.service';

describe('MetaApiClient Instagram discovery', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.META_OAUTH_DEBUG;
  });

  it('uses page access token when fetching Instagram account details', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ig-1',
        username: 'acme_ig',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const client = new MetaApiClient({} as MetaConfigService);
    const accounts = await client.listInstagramAccounts('user-token', [
      {
        id: 'page-1',
        name: 'Acme Page',
        access_token: 'page-token',
        instagram_business_account: { id: 'ig-1' },
      },
    ]);

    expect(accounts).toHaveLength(1);
    expect(accounts[0].username).toBe('acme_ig');
    expect(accounts[0].pageAccessToken).toBe('page-token');
    const calledUrl = (fetchMock.mock.calls[0][0] as string).toString();
    expect(calledUrl).toContain('ig-1');
    expect(calledUrl).toContain('access_token=page-token');
  });

  it('uses nested instagram_business_account from page list without extra ig fetch', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const client = new MetaApiClient({} as MetaConfigService);
    const accounts = await client.listInstagramAccounts('user-token', [
      {
        id: 'page-1',
        name: 'Acme Page',
        access_token: 'page-token',
        instagram_business_account: {
          id: 'ig-1',
          username: 'acme_ig',
          name: 'Acme IG',
        },
      },
    ]);

    expect(accounts).toHaveLength(1);
    expect(accounts[0].username).toBe('acme_ig');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to page lookup when instagram_business_account missing on list item', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        instagram_business_account: {
          id: 'ig-2',
          username: 'from_page_lookup',
        },
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const client = new MetaApiClient({} as MetaConfigService);
    const accounts = await client.listInstagramAccounts('user-token', [
      {
        id: 'page-2',
        name: 'Other Page',
        access_token: 'page-token-2',
      },
    ]);

    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe('ig-2');
    expect(accounts[0].username).toBe('from_page_lookup');
    const pageLookupUrl = fetchMock.mock.calls[0][0] as string;
    expect(pageLookupUrl).toContain('/page-2');
    expect(pageLookupUrl).toContain('instagram_business_account');
  });

  it('paginates /me/accounts', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'page-1', name: 'Page 1' }],
          paging: { next: 'https://graph.facebook.com/next-page' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'page-2', name: 'Page 2' }],
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    const client = new MetaApiClient({} as MetaConfigService);
    const pages = await client.listPages('user-token');

    expect(pages).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to debug_token granular_scopes when /me/accounts is empty', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            scopes: ['pages_show_list', 'pages_messaging'],
            granular_scopes: [
              {
                scope: 'pages_show_list',
                target_ids: ['108358145323769'],
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '108358145323769',
          name: 'Beauty of Gothic Lady',
          access_token: 'page-token',
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    const client = new MetaApiClient({
      getMetaAppConfig: () => ({
        appId: 'app-id',
        appSecret: 'app-secret',
      }),
    } as unknown as MetaConfigService);

    const pages = await client.listPages('user-token');

    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe('108358145323769');
    expect(pages[0].name).toBe('Beauty of Gothic Lady');
    expect(pages[0].access_token).toBe('page-token');
    expect((fetchMock.mock.calls[1][0] as string).toString()).toContain(
      '/debug_token',
    );
    const pageLookupUrl = (fetchMock.mock.calls[2][0] as string).toString();
    expect(pageLookupUrl).toContain('/108358145323769');
    expect(pageLookupUrl).not.toContain('tasks');
  });

  it('ignores business_management target_ids when recovering pages', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            scopes: ['pages_show_list', 'business_management'],
            granular_scopes: [
              {
                scope: 'pages_show_list',
                target_ids: ['108358145323769'],
              },
              {
                scope: 'business_management',
                target_ids: ['1712991683169536'],
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '108358145323769',
          name: 'Beauty of Gothic Lady',
          access_token: 'page-token',
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    const client = new MetaApiClient({
      getMetaAppConfig: () => ({
        appId: 'app-id',
        appSecret: 'app-secret',
      }),
    } as unknown as MetaConfigService);

    const pages = await client.listPages('user-token');

    expect(pages).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[2][0] as string).toString()).toContain(
      '/108358145323769',
    );
  });
});
