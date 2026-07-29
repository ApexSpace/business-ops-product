import { SmsModeResolverService } from './sms-mode-resolver.service';
import {
  PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
  PLATFORM_SMS_METADATA_TYPE,
  PLATFORM_SMS_RESOURCE_EXTERNAL_ID,
} from '@app/modules/communications/sms/constants/sms-platform.constants';

describe('SmsModeResolverService', () => {
  const businessIntegrationRepository = {
    findByBusinessAndKey: jest.fn(),
  };
  const integrationResourceRepository = {
    findByIdAndBusiness: jest.fn(),
    findDefault: jest.fn(),
    findManyByBusinessAndProvider: jest.fn(),
    findActiveByExternalId: jest.fn(),
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
      messagingServiceSid: 'MGxxx',
    });

    expect(service.resolvePlatformNotification()).toEqual({
      mode: 'platform',
      accountSid: 'ACxxx',
      authToken: 'token',
      fromNumber: '+18445450793',
      resource: null,
      twoWayEnabled: false,
      messagingServiceSid: 'MGxxx',
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
      messagingServiceSid: null,
    });
    integrationResourceRepository.findDefault.mockResolvedValue(null);
    integrationResourceRepository.findManyByBusinessAndProvider.mockResolvedValue(
      [],
    );

    await expect(service.resolveForBusiness('biz-1')).resolves.toEqual({
      mode: 'platform',
      accountSid: 'ACxxx',
      authToken: 'token',
      fromNumber: '+18445450793',
      resource: null,
      twoWayEnabled: false,
      messagingServiceSid: null,
    });
  });

  it('resolveNotificationForBusiness prefers PLATFORM_PROVISIONED fromNumber', async () => {
    const service = createService({
      enabled: true,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
      messagingServiceSid: 'MGshared',
    });
    const resource = {
      id: 'res-1',
      providerKey: 'sms',
      externalId: '+15125550199',
      metadata: {
        type: PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
        fromNumber: '+15125550199',
        twoWayEnabled: false,
        messagingServiceSid: 'MGshared',
      },
    };
    integrationResourceRepository.findDefault.mockResolvedValue(resource);

    await expect(
      service.resolveNotificationForBusiness('biz-1'),
    ).resolves.toEqual({
      mode: 'platform',
      accountSid: 'ACxxx',
      authToken: 'token',
      fromNumber: '+15125550199',
      resource,
      twoWayEnabled: false,
      messagingServiceSid: 'MGshared',
    });
  });

  it('isOneWayNotificationNumber is true for provisioned numbers with twoWayEnabled false', async () => {
    const service = createService({
      enabled: true,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
    });
    integrationResourceRepository.findActiveByExternalId.mockResolvedValue({
      externalId: '+15125550199',
      metadata: {
        type: PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
        twoWayEnabled: false,
      },
    });

    await expect(
      service.isOneWayNotificationNumber('+15125550199'),
    ).resolves.toBe(true);
  });

  it('isOneWayNotificationNumber is false for business-owned numbers', async () => {
    const service = createService({
      enabled: true,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
    });
    integrationResourceRepository.findActiveByExternalId.mockResolvedValue({
      externalId: '+15125550199',
      metadata: {
        type: 'BUSINESS_OWNED',
        twoWayEnabled: true,
      },
    });

    await expect(
      service.isOneWayNotificationNumber('+15125550199'),
    ).resolves.toBe(false);
  });

  it('legacy PLATFORM_SHARED still resolves to env From', async () => {
    const service = createService({
      enabled: true,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
      messagingServiceSid: null,
    });
    integrationResourceRepository.findDefault.mockResolvedValue({
      id: 'res-shared',
      providerKey: 'sms',
      externalId: PLATFORM_SMS_RESOURCE_EXTERNAL_ID,
      metadata: {
        type: PLATFORM_SMS_METADATA_TYPE,
        twoWayEnabled: false,
      },
    });

    await expect(
      service.resolveNotificationForBusiness('biz-1'),
    ).resolves.toMatchObject({
      fromNumber: '+18445450793',
      twoWayEnabled: false,
    });
  });
});
