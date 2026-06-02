import { MetaConfigService } from './meta-config.service';

describe('MetaConfigService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createService(): MetaConfigService {
    return new MetaConfigService({ get: jest.fn() } as never);
  }

  it('reads login and embedded signup config IDs separately', () => {
    process.env.META_APP_ID = 'app-id';
    process.env.META_APP_SECRET = 'secret';
    process.env.META_REDIRECT_URI = 'http://localhost:3000/callback';
    process.env.META_LOGIN_CONFIG_ID = 'login-config-123';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-config-456';

    const service = createService();
    const config = service.getMetaAppConfig();

    expect(config.loginConfigId).toBe('login-config-123');
    expect(config.embeddedSignupConfigId).toBe('whatsapp-config-456');
    expect(service.hasLoginConfig()).toBe(true);
    expect(service.hasEmbeddedSignupConfig()).toBe(true);
  });

  it('assertLoginConfigForOAuth rejects missing login config', () => {
    process.env.META_APP_ID = 'app-id';
    process.env.META_APP_SECRET = 'secret';
    process.env.META_REDIRECT_URI = 'http://localhost:3000/callback';
    delete process.env.META_LOGIN_CONFIG_ID;
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();
    expect(() => service.assertLoginConfigForOAuth('instagram')).toThrow(
      /META_LOGIN_CONFIG_ID/,
    );
  });

  it('assertEmbeddedSignupConfigForWhatsApp rejects missing embedded config', () => {
    process.env.META_APP_ID = 'app-id';
    process.env.META_APP_SECRET = 'secret';
    process.env.META_REDIRECT_URI = 'http://localhost:3000/callback';
    process.env.META_LOGIN_CONFIG_ID = 'login-only';
    delete process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;

    const service = createService();
    expect(() => service.assertEmbeddedSignupConfigForWhatsApp()).toThrow(
      /META_EMBEDDED_SIGNUP_CONFIG_ID/,
    );
  });

  it('reports missing login config independently of WhatsApp config', () => {
    process.env.META_APP_ID = 'app-id';
    process.env.META_APP_SECRET = 'secret';
    process.env.META_REDIRECT_URI = 'http://localhost:3000/callback';
    delete process.env.META_LOGIN_CONFIG_ID;
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();

    expect(service.hasLoginConfig()).toBe(false);
    expect(service.hasEmbeddedSignupConfig()).toBe(true);
  });
});
