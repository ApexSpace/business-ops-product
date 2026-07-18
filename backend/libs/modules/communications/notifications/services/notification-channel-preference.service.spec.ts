import { NotificationChannel } from '@prisma/client';
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
      notificationKey: 'appointment.express_complete',
      channel: NotificationChannel.SMS,
    });

    const result = await service.setChannel(
      'biz-1',
      'appointment.express_complete',
      NotificationChannel.SMS,
    );

    expect(preferenceRepository.upsert).toHaveBeenCalledWith(
      'biz-1',
      'appointment.express_complete',
      NotificationChannel.SMS,
    );
    expect(result).toEqual({
      notificationKey: 'appointment.express_complete',
      channel: NotificationChannel.SMS,
      isDefault: false,
    });
  });

  it('rejects unsupported notification keys', async () => {
    await expect(
      service.setChannel(
        'biz-1',
        'appointment.confirmation',
        NotificationChannel.SMS,
      ),
    ).rejects.toThrow(
      'Channel preference is not supported for notification key: appointment.confirmation',
    );
  });

  it('lists allowed keys with defaults', async () => {
    preferenceRepository.findByBusiness.mockResolvedValue([]);

    await expect(service.listForBusiness('biz-1')).resolves.toEqual([
      {
        notificationKey: 'appointment.express_complete',
        channel: NotificationChannel.EMAIL,
        isDefault: true,
      },
    ]);
  });
});
