import { SmsModeResolverService } from './sms-mode-resolver.service';

describe('SmsModeResolverService', () => {
  const businessIntegrationRepository = {
    findByBusinessAndKey: jest.fn(),
  };
  const integrationResourceRepository = {
    findByIdAndBusiness: jest.fn(),
    findDefault: jest.fn(),
  };
  const twilioCredentialsService = {
    decrypt: jest.fn(),
  };

  function createService(twilio: Record<string, unknown>) {
    const configService = {
      get: jest.fn().mockReturnValue(twilio),
    };
    return new SmsModeResolverService(
      configService as never,
      businessIntegrationRepository as never,
      integrationResourceRepository as never,
      twilioCredentialsService as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolvePlatformNotification returns platform context from env when enabled', () => {
    const service = createService({
      enabled: true,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
    });

    expect(service.resolvePlatformNotification()).toEqual({
      mode: 'platform',
      accountSid: 'ACxxx',
      authToken: 'token',
      fromNumber: '+18445450793',
      resource: null,
      twoWayEnabled: false,
    });
  });

  it('resolvePlatformNotification returns null when Twilio is disabled', () => {
    const service = createService({
      enabled: false,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
    });

    expect(service.resolvePlatformNotification()).toBeNull();
  });

  it('resolveForBusiness falls back to platform when no SMS resource exists', async () => {
    const service = createService({
      enabled: true,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
    });
    integrationResourceRepository.findDefault.mockResolvedValue(null);

    await expect(service.resolveForBusiness('biz-1')).resolves.toEqual({
      mode: 'platform',
      accountSid: 'ACxxx',
      authToken: 'token',
      fromNumber: '+18445450793',
      resource: null,
      twoWayEnabled: false,
    });
  });
});
