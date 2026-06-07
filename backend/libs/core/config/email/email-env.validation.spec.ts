import { validateEnv } from '../env.validation';

describe('email env validation', () => {
  const baseValidEnv = {
    NODE_ENV: 'test',
    API_PREFIX: 'api/v1',
    DATABASE_URL:
      'postgresql://postgres:password@localhost:5432/app_db?schema=public',
  };

  it('EMAIL_ENABLED=false works without RESEND_API_KEY', () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        EMAIL_ENABLED: 'false',
      }),
    ).not.toThrow();
  });

  it('EMAIL_ENABLED=true requires RESEND_API_KEY', () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        EMAIL_ENABLED: 'true',
        EMAIL_DEFAULT_FROM: 'no-reply@example.com',
      }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('EMAIL_ENABLED=true requires EMAIL_DEFAULT_FROM', () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        EMAIL_ENABLED: 'true',
        RESEND_API_KEY: 're_test_key',
      }),
    ).toThrow(/EMAIL_DEFAULT_FROM/);
  });

  it('EMAIL_ENABLED=true with valid credentials passes', () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        EMAIL_ENABLED: 'true',
        RESEND_API_KEY: 're_test_key',
        EMAIL_DEFAULT_FROM:
          'CodeSol Technologies <no-reply@notify.codesoltech.com>',
        EMAIL_DEFAULT_REPLY_TO: 'support@codesoltech.com',
      }),
    ).not.toThrow();
  });

  it('RESEND_WEBHOOK_SECRET is optional when EMAIL_ENABLED=false', () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        EMAIL_ENABLED: 'false',
      }),
    ).not.toThrow();
  });

  it('RESEND_WEBHOOK_SECRET is optional when EMAIL_ENABLED=true', () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        EMAIL_ENABLED: 'true',
        RESEND_API_KEY: 're_test_key',
        EMAIL_DEFAULT_FROM: 'no-reply@example.com',
      }),
    ).not.toThrow();
  });
});
