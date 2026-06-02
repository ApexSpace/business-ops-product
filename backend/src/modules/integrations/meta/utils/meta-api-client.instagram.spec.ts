import { MetaApiClient } from '../services/meta-api-client';
import { MetaConfigService } from '../services/meta-config.service';

describe('MetaApiClient listInstagramAccounts', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
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
    const calledUrl = (fetchMock.mock.calls[0][0] as string).toString();
    expect(calledUrl).toContain('ig-1');
    expect(calledUrl).toContain('access_token=page-token');
  });
});
