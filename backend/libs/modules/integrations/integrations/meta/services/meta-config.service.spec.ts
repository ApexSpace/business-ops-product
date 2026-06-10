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

  function setBaseMetaEnv(): void {
    process.env.META_APP_ID = 'app-id';
    process.env.META_APP_SECRET = 'secret';
    process.env.META_REDIRECT_URI = 'http://localhost:3000/callback';
  }

  function createService(): MetaConfigService {
    return new MetaConfigService({ get: jest.fn() } as never);
  }

  it('reads login and embedded signup config IDs separately', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'facebook-config';
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'instagram-config';
    process.env.META_LOGIN_CONFIG_ID = 'legacy-login';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-config-456';

    const service = createService();
    const config = service.getMetaAppConfig();

    expect(config.facebookLoginConfigId).toBe('facebook-config');
    expect(config.instagramLoginConfigId).toBe('instagram-config');
    expect(config.loginConfigId).toBe('legacy-login');
    expect(config.embeddedSignupConfigId).toBe('whatsapp-config-456');
    expect(service.hasLoginConfig()).toBe(true);
    expect(service.hasEmbeddedSignupConfig()).toBe(true);
  });

  it('facebook uses META_FACEBOOK_LOGIN_CONFIG_ID', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'facebook-only';
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'instagram-only';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();
    const resolution = service.assertLoginConfigForOAuth('facebook');

    expect(resolution.configId).toBe('facebook-only');
    expect(resolution.source).toBe('META_FACEBOOK_LOGIN_CONFIG_ID');
  });

  it('instagram uses META_INSTAGRAM_LOGIN_CONFIG_ID', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'facebook-only';
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'instagram-only';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();
    const resolution = service.assertLoginConfigForOAuth('instagram');

    expect(resolution.configId).toBe('instagram-only');
    expect(resolution.source).toBe('META_INSTAGRAM_LOGIN_CONFIG_ID');
  });

  it('facebook falls back to META_LOGIN_CONFIG_ID when provider-specific ID missing', () => {
    setBaseMetaEnv();
    delete process.env.META_FACEBOOK_LOGIN_CONFIG_ID;
    process.env.META_LOGIN_CONFIG_ID = 'legacy-fallback';
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'instagram-only';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();
    const resolution = service.assertLoginConfigForOAuth('facebook');

    expect(resolution.configId).toBe('legacy-fallback');
    expect(resolution.source).toBe('META_LOGIN_CONFIG_ID');
  });

  it('instagram falls back to META_LOGIN_CONFIG_ID when provider-specific ID missing', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'facebook-only';
    delete process.env.META_INSTAGRAM_LOGIN_CONFIG_ID;
    process.env.META_LOGIN_CONFIG_ID = 'legacy-fallback';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();
    const resolution = service.assertLoginConfigForOAuth('instagram');

    expect(resolution.configId).toBe('legacy-fallback');
    expect(resolution.source).toBe('META_LOGIN_CONFIG_ID');
  });

  it('whatsapp uses META_EMBEDDED_SIGNUP_CONFIG_ID only', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'facebook-only';
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'instagram-only';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();

    expect(service.assertEmbeddedSignupConfigForWhatsApp()).toBe(
      'whatsapp-only',
    );
  });

  it('rejects facebook OAuth config ID equal to WhatsApp embedded config ID', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'shared-id';
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'instagram-only';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'shared-id';

    const service = createService();

    expect(() => service.assertLoginConfigForOAuth('facebook')).toThrow(
      /must not match META_EMBEDDED_SIGNUP_CONFIG_ID/,
    );
  });

  it('rejects instagram OAuth config ID equal to WhatsApp embedded config ID', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'facebook-only';
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'shared-id';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'shared-id';

    const service = createService();

    expect(() => service.assertLoginConfigForOAuth('instagram')).toThrow(
      /must not match META_EMBEDDED_SIGNUP_CONFIG_ID/,
    );
  });

  it('assertLoginConfigForOAuth rejects missing facebook config', () => {
    setBaseMetaEnv();
    delete process.env.META_FACEBOOK_LOGIN_CONFIG_ID;
    delete process.env.META_LOGIN_CONFIG_ID;
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'instagram-only';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();
    expect(() => service.assertLoginConfigForOAuth('facebook')).toThrow(
      /META_FACEBOOK_LOGIN_CONFIG_ID/,
    );
  });

  it('assertLoginConfigForOAuth rejects missing instagram config', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'facebook-only';
    delete process.env.META_INSTAGRAM_LOGIN_CONFIG_ID;
    delete process.env.META_LOGIN_CONFIG_ID;
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'whatsapp-only';

    const service = createService();
    expect(() => service.assertLoginConfigForOAuth('instagram')).toThrow(
      /META_INSTAGRAM_LOGIN_CONFIG_ID/,
    );
  });

  it('assertEmbeddedSignupConfigForWhatsApp rejects missing embedded config', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'facebook-only';
    delete process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;

    const service = createService();
    expect(() => service.assertEmbeddedSignupConfigForWhatsApp()).toThrow(
      /META_EMBEDDED_SIGNUP_CONFIG_ID/,
    );
  });

  it('rejects WhatsApp embedded config matching facebook login config', () => {
    setBaseMetaEnv();
    process.env.META_FACEBOOK_LOGIN_CONFIG_ID = 'same-as-wa';
    process.env.META_INSTAGRAM_LOGIN_CONFIG_ID = 'instagram-only';
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = 'same-as-wa';

    const service = createService();
    expect(() => service.assertEmbeddedSignupConfigForWhatsApp()).toThrow(
      /must be different/,
    );
  });
});
