import { TrialOtpService } from './trial-otp.service';

describe('TrialOtpService rate limits and handoff', () => {
  const redisStore = new Map<string, { value: string; ttl?: number }>();
  const redisClient = {
    incr: jest.fn(async (key: string) => {
      const current = Number(redisStore.get(key)?.value ?? '0') + 1;
      redisStore.set(key, { value: String(current) });
      return current;
    }),
    expire: jest.fn(async () => 1),
    set: jest.fn(async (key: string, value: string) => {
      redisStore.set(key, { value });
      return 'OK';
    }),
    get: jest.fn(async (key: string) => redisStore.get(key)?.value ?? null),
    del: jest.fn(async (key: string) => {
      redisStore.delete(key);
      return 1;
    }),
  };

  const redis = {
    getClient: () => redisClient,
  };
  const jwtService = {
    signAsync: jest.fn(async () => 'phone-token'),
    verifyAsync: jest.fn(async () => ({
      purpose: 'trial_phone_verified',
      phoneE164: '+15551234567',
      sub: '+15551234567',
    })),
  };
  const configService = {
    get: jest.fn(() => 'test-access-secret-min-16'),
  };
  const twilioApiClient = {
    sendMessage: jest.fn().mockResolvedValue({ sid: 'SM1', status: 'queued' }),
  };
  const smsModeResolver = {
    resolvePlatformNotification: jest.fn(() => ({
      accountSid: 'ACxxx',
      authToken: 'token',
      fromNumber: '+15550001111',
    })),
  };

  const service = new TrialOtpService(
    redis as never,
    jwtService as never,
    configService as never,
    twilioApiClient as never,
    smsModeResolver as never,
  );

  beforeEach(() => {
    redisStore.clear();
    jest.clearAllMocks();
  });

  it('enforces send-otp phone rate limits', async () => {
    await service.assertSendOtpLimits({
      phoneE164: '+15551234567',
      ip: '1.1.1.1',
      sessionId: 'sess-1',
    });
    await service.assertSendOtpLimits({
      phoneE164: '+15551234567',
      ip: '1.1.1.1',
      sessionId: 'sess-1',
    });
    await service.assertSendOtpLimits({
      phoneE164: '+15551234567',
      ip: '1.1.1.1',
      sessionId: 'sess-1',
    });
    await expect(
      service.assertSendOtpLimits({
        phoneE164: '+15551234567',
        ip: '1.1.1.1',
        sessionId: 'sess-1',
      }),
    ).rejects.toThrow('Too many attempts');
  });

  it('creates and consumes a one-time handoff code', async () => {
    const code = await service.createHandoffCode({
      accessToken: 'a',
      refreshToken: 'r',
      userId: 'user-1',
    });
    const first = await service.consumeHandoffCode(code);
    expect(first.userId).toBe('user-1');
    await expect(service.consumeHandoffCode(code)).rejects.toThrow(
      'Invalid or expired handoff code',
    );
  });

  it('sends otp when platform SMS is configured', async () => {
    await expect(service.sendOtp('+15551234567')).resolves.toEqual({
      sent: true,
    });
    expect(twilioApiClient.sendMessage).toHaveBeenCalled();
  });
});
