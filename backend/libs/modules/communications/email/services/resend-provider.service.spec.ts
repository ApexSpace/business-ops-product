import { ResendProviderService } from './resend-provider.service';

const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

describe('ResendProviderService', () => {
  const emailConfig = {
    enabled: true,
    defaultFrom: 'Test <no-reply@example.com>',
    defaultReplyTo: null,
    resend: { apiKey: 're_test_key', webhookSecret: null },
    queue: { concurrency: 10, jobAttempts: 5, jobBackoffMs: 2000 },
  };

  function createService(config = emailConfig) {
    const configService = {
      get: jest.fn((key: string, opts?: { infer?: boolean }) => {
        if (key === 'email') return config;
        if (key === 'email.resend.apiKey' && opts?.infer) {
          return config.resend.apiKey;
        }
        return undefined;
      }),
    };
    return new ResendProviderService(configService as never);
  }

  beforeEach(() => {
    sendMock.mockReset();
  });

  it('reports configured when email enabled with api key', () => {
    const service = createService();
    expect(service.isConfigured()).toBe(true);
  });

  it('returns provider message id on success', async () => {
    sendMock.mockResolvedValue({ data: { id: 're_abc' }, error: null });
    const service = createService();

    const result = await service.send({
      from: 'Test <no-reply@example.com>',
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(result).toEqual({ providerMessageId: 're_abc' });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
  });

  it('throws when Resend returns an error', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'Invalid from address' },
    });
    const service = createService();

    await expect(
      service.send({
        from: 'bad',
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
      }),
    ).rejects.toThrow('Invalid from address');
  });
});
