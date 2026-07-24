import { NotificationChannel } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { NotificationDispatchService } from './notification-dispatch.service';

describe('NotificationDispatchService', () => {
  const channelPreferenceService = {
    getChannel: jest.fn(),
  };
  const emailNotificationService = {
    enqueueTransactionalEmail: jest.fn().mockResolvedValue(undefined),
    isNotificationEnabled: jest.fn().mockResolvedValue(true),
  };
  const emailRenderer = {
    render: jest.fn(
      (template: string, variables: Record<string, string>) =>
        template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key: string) =>
          variables[key] ?? '',
        ),
    ),
  };
  const platformSmsSendService = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
  };
  const effectiveCapabilities = {
    resolveFeatureKeys: jest
      .fn()
      .mockResolvedValue(new Set(['sms.notifications'])),
  };

  const service = new NotificationDispatchService(
    channelPreferenceService as never,
    emailNotificationService as never,
    emailRenderer as never,
    platformSmsSendService as never,
    effectiveCapabilities as never,
  );

  const baseParams = {
    businessId: 'biz-1',
    notificationKey: 'appointment.confirmation',
    variables: {
      'business.name': 'Acme',
      'contact.name': 'Jane',
      'appointment.start_at': 'Mon 10am',
      'appointment.end_at': 'Mon 11am',
      'appointment.calendar_name': 'Hair',
      'appointment.title': 'Jane - Hair',
    },
    toEmail: 'jane@example.com',
    toPhone: '+15551234567',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    channelPreferenceService.getChannel.mockResolvedValue(
      NotificationChannel.EMAIL,
    );
    emailNotificationService.isNotificationEnabled.mockResolvedValue(true);
    effectiveCapabilities.resolveFeatureKeys.mockResolvedValue(
      new Set(['sms.notifications']),
    );
  });

  it('routes to email when channel is EMAIL', async () => {
    await expect(service.dispatch(baseParams)).resolves.toBe('email');

    expect(
      emailNotificationService.enqueueTransactionalEmail,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'appointment.confirmation',
        toEmail: 'jane@example.com',
      }),
    );
    expect(platformSmsSendService.sendNotification).not.toHaveBeenCalled();
  });

  it('routes to SMS when channel is SMS', async () => {
    channelPreferenceService.getChannel.mockResolvedValue(
      NotificationChannel.SMS,
    );

    await expect(service.dispatch(baseParams)).resolves.toBe('sms');

    expect(platformSmsSendService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        to: '+15551234567',
        body: expect.stringContaining('Jane'),
      }),
    );
    expect(
      emailNotificationService.enqueueTransactionalEmail,
    ).not.toHaveBeenCalled();
  });

  it('skips SMS when notification is disabled', async () => {
    channelPreferenceService.getChannel.mockResolvedValue(
      NotificationChannel.SMS,
    );
    emailNotificationService.isNotificationEnabled.mockResolvedValue(false);

    await expect(service.dispatch(baseParams)).resolves.toBe('skipped');
    expect(platformSmsSendService.sendNotification).not.toHaveBeenCalled();
  });

  it('skips when SMS recipient is missing and policy is skip', async () => {
    channelPreferenceService.getChannel.mockResolvedValue(
      NotificationChannel.SMS,
    );

    await expect(
      service.dispatch({
        ...baseParams,
        toPhone: null,
        missingRecipient: 'skip',
      }),
    ).resolves.toBe('skipped');
  });

  it('throws when SMS recipient is missing and policy is throw', async () => {
    channelPreferenceService.getChannel.mockResolvedValue(
      NotificationChannel.SMS,
    );

    await expect(
      service.dispatch({
        ...baseParams,
        toPhone: null,
        missingRecipient: 'throw',
      }),
    ).rejects.toBeInstanceOf(AppException);
  });
});
