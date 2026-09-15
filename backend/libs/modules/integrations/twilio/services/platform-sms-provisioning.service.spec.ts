import { PlatformSmsProvisioningService } from './platform-sms-provisioning.service';
import {
  PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
  SMS_A2P_POOL_SHARED,
} from '@app/modules/communications/sms/constants/sms-platform.constants';

describe('PlatformSmsProvisioningService', () => {
  const configService = {
    get: jest.fn(),
  };
  const businessRepository = {
    findById: jest.fn(),
  };
  const businessIntegrationRepository = {
    upsert: jest.fn(),
  };
  const integrationResourceRepository = {
    findDefault: jest.fn(),
    findManyByBusinessAndProvider: jest.fn(),
    clearDefaultForType: jest.fn(),
    upsertMany: jest.fn(),
  };
  const twilioApiClient = {
    searchAvailableUsLocalNumbers: jest.fn(),
    purchasePhoneNumber: jest.fn(),
    addPhoneNumberToMessagingService: jest.fn(),
    buildInboundWebhookUrl: jest.fn(),
    configureIncomingSmsWebhook: jest.fn(),
  };

  function createService() {
    return new PlatformSmsProvisioningService(
      configService as never,
      businessRepository as never,
      businessIntegrationRepository as never,
      integrationResourceRepository as never,
      twilioApiClient as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue({
      enabled: true,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
      messagingServiceSid: 'MGshared',
      defaultAreaCode: '512',
      autoPurchaseNumbers: true,
    });
    integrationResourceRepository.findManyByBusinessAndProvider.mockResolvedValue(
      [],
    );
    integrationResourceRepository.findDefault.mockResolvedValue(null);
    integrationResourceRepository.clearDefaultForType.mockResolvedValue(
      undefined,
    );
    twilioApiClient.buildInboundWebhookUrl.mockReturnValue(
      'https://api.example.com/api/v1/webhooks/twilio/sms',
    );
  });

  it('skips non-US businesses and links shared env fallback', async () => {
    const service = createService();
    businessRepository.findById.mockResolvedValue({
      id: 'biz-1',
      name: 'London Salon',
      phoneCountryCode: '+44',
      phoneNumber: '2071838750',
    });
    businessIntegrationRepository.upsert.mockResolvedValue({ id: 'int-1' });
    integrationResourceRepository.upsertMany.mockResolvedValue([
      { id: 'res-1', businessIntegrationId: 'int-1' },
    ]);

    const result = await service.connectPlatformDefaultSms('biz-1');

    expect(twilioApiClient.searchAvailableUsLocalNumbers).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      fromNumber: '+18445450793',
      provisioned: false,
    });
  });

  it('buys US local number matching area code and adds to Messaging Service', async () => {
    const service = createService();
    businessRepository.findById.mockResolvedValue({
      id: 'biz-1',
      name: 'Austin Salon',
      phoneCountryCode: '+1',
      phoneNumber: '5125550199',
    });
    twilioApiClient.searchAvailableUsLocalNumbers.mockResolvedValue([
      { phoneNumber: '+15125550100', friendlyName: '512', locality: null, region: null },
    ]);
    twilioApiClient.purchasePhoneNumber.mockResolvedValue({
      sid: 'PNxxx',
      phoneNumber: '+15125550100',
      friendlyName: 'Austin Salon',
    });
    businessIntegrationRepository.upsert.mockResolvedValue({ id: 'int-1' });
    integrationResourceRepository.upsertMany.mockResolvedValue([
      { id: 'res-1', businessIntegrationId: 'int-1' },
    ]);

    const result = await service.connectPlatformDefaultSms('biz-1');

    expect(twilioApiClient.searchAvailableUsLocalNumbers).toHaveBeenCalledWith(
      expect.objectContaining({ areaCode: '512' }),
    );
    expect(twilioApiClient.purchasePhoneNumber).toHaveBeenCalled();
    expect(twilioApiClient.addPhoneNumberToMessagingService).toHaveBeenCalledWith(
      expect.objectContaining({
        messagingServiceSid: 'MGshared',
        phoneNumberSid: 'PNxxx',
      }),
    );
    expect(businessIntegrationRepository.upsert).toHaveBeenCalledWith(
      'biz-1',
      'sms',
      expect.objectContaining({
        config: expect.objectContaining({
          mode: PLATFORM_PROVISIONED_SMS_METADATA_TYPE,
          a2pPool: SMS_A2P_POOL_SHARED,
          twoWayEnabled: false,
        }),
      }),
    );
    expect(result).toMatchObject({
      fromNumber: '+15125550100',
      provisioned: true,
      a2pPool: SMS_A2P_POOL_SHARED,
    });
  });

  it('falls back to any US local when area code inventory is empty', async () => {
    const service = createService();
    businessRepository.findById.mockResolvedValue({
      id: 'biz-1',
      name: 'Austin Salon',
      phoneCountryCode: 'US',
      phoneNumber: '7375550142',
    });
    twilioApiClient.searchAvailableUsLocalNumbers
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          phoneNumber: '+12125550100',
          friendlyName: 'NY',
          locality: null,
          region: null,
        },
      ]);
    twilioApiClient.purchasePhoneNumber.mockResolvedValue({
      sid: 'PNyyy',
      phoneNumber: '+12125550100',
      friendlyName: 'Austin Salon',
    });
    businessIntegrationRepository.upsert.mockResolvedValue({ id: 'int-1' });
    integrationResourceRepository.upsertMany.mockResolvedValue([
      { id: 'res-1', businessIntegrationId: 'int-1' },
    ]);

    const result = await service.connectPlatformDefaultSms('biz-1');

    expect(twilioApiClient.searchAvailableUsLocalNumbers).toHaveBeenCalledTimes(
      2,
    );
    expect(result.fromNumber).toBe('+12125550100');
    expect(result.provisioned).toBe(true);
  });

  it('skips purchase when autoPurchaseNumbers is false and uses shared From', async () => {
    configService.get.mockReturnValue({
      enabled: true,
      accountSid: 'ACxxx',
      authToken: 'token',
      platformFromNumber: '+18445450793',
      messagingServiceSid: 'MGshared',
      defaultAreaCode: '512',
      autoPurchaseNumbers: false,
    });
    const service = createService();
    businessRepository.findById.mockResolvedValue({
      id: 'biz-1',
      name: 'Austin Salon',
      phoneCountryCode: '+1',
      phoneNumber: '5125550199',
    });
    businessIntegrationRepository.upsert.mockResolvedValue({ id: 'int-1' });
    integrationResourceRepository.upsertMany.mockResolvedValue([
      { id: 'res-1', businessIntegrationId: 'int-1' },
    ]);

    const result = await service.connectPlatformDefaultSms('biz-1');

    expect(twilioApiClient.searchAvailableUsLocalNumbers).not.toHaveBeenCalled();
    expect(twilioApiClient.purchasePhoneNumber).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      fromNumber: '+18445450793',
      provisioned: false,
    });
  });
});
