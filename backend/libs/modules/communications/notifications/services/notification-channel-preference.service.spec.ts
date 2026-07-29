import { NotificationChannel } from '@prisma/client';
import { CHANNEL_OVERRIDE_NOTIFICATION_KEYS } from '../constants/notification-channel.constants';
import { NotificationChannelPreferenceService } from './notification-channel-preference.service';

describe('NotificationChannelPreferenceService', () => {
  const preferenceRepository = {
    findByBusinessAndKey: jest.fn(),
    findByBusiness: jest.fn(),
    upsert: jest.fn(),
  };

  const service = new NotificationChannelPreferenceService(
    preferenceRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to EMAIL when no preference row exists', async () => {
    preferenceRepository.findByBusinessAndKey.mockResolvedValue(null);

    await expect(
      service.getChannel('biz-1', 'appointment.express_complete'),
    ).resolves.toBe(NotificationChannel.EMAIL);
  });

  it('returns stored channel when present', async () => {
    preferenceRepository.findByBusinessAndKey.mockResolvedValue({
      channel: NotificationChannel.SMS,
    });

    await expect(
      service.getChannel('biz-1', 'appointment.express_complete'),
    ).resolves.toBe(NotificationChannel.SMS);
  });

  it('upserts an allowed notification key', async () => {
    preferenceRepository.upsert.mockResolvedValue({
      notificationKey: 'appointment.confirmation',
      channel: NotificationChannel.SMS,
    });

    const result = await service.setChannel(
      'biz-1',
      'appointment.confirmation',
      NotificationChannel.SMS,
    );

    expect(preferenceRepository.upsert).toHaveBeenCalledWith(
      'biz-1',
      'appointment.confirmation',
      NotificationChannel.SMS,
    );
    expect(result).toEqual({
      notificationKey: 'appointment.confirmation',
      channel: NotificationChannel.SMS,
      isDefault: false,
    });
  });

  it('rejects unsupported notification keys', async () => {
    await expect(
      service.setChannel(
        'biz-1',
        'auth.password_reset',
        NotificationChannel.SMS,
      ),
    ).rejects.toThrow(
      'Channel preference is not supported for notification key: auth.password_reset',
    );
  });

  it('lists all business-configurable keys with defaults', async () => {
    preferenceRepository.findByBusiness.mockResolvedValue([]);

    const list = await service.listForBusiness('biz-1');

    expect(list.length).toBe(CHANNEL_OVERRIDE_NOTIFICATION_KEYS.length);
    expect(list).toEqual(
      expect.arrayContaining([
        {
          notificationKey: 'appointment.express_complete',
          channel: NotificationChannel.EMAIL,
          isDefault: true,
        },
        {
          notificationKey: 'appointment.confirmation',
          channel: NotificationChannel.EMAIL,
          isDefault: true,
        },
        {
          notificationKey: 'invoice.sent',
          channel: NotificationChannel.EMAIL,
          isDefault: true,
        },
      ]),
    );
    expect(
      list.find((item) => item.notificationKey === 'auth.password_reset'),
    ).toBeUndefined();
    expect(
      list.find((item) => item.notificationKey === 'automation.workflow'),
    ).toBeUndefined();
  });
});
