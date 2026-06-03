import { MetaApiClient } from '../services/meta-api-client';
import { MetaConfigService } from '../services/meta-config.service';

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
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
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
});
