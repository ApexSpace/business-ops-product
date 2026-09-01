import { WaitingRoomSettingsService } from './waiting-room-settings.service';

describe('WaitingRoomSettingsService', () => {
  const settingsRow = {
    id: 'wr-1',
    businessId: 'biz-1',
    waitingStatusEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let repository: {
    ensureSettings: jest.Mock;
    upsert: jest.Mock;
  };
  let auditService: { log: jest.Mock };
  let service: WaitingRoomSettingsService;

  beforeEach(() => {
    repository = {
      ensureSettings: jest.fn().mockResolvedValue(settingsRow),
      upsert: jest.fn().mockResolvedValue({
        ...settingsRow,
        waitingStatusEnabled: false,
      }),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    service = new WaitingRoomSettingsService(
      repository as never,
      auditService as never,
    );
  });

  it('returns default waitingStatusEnabled on getSettings', async () => {
    const result = await service.getSettings('biz-1');

    expect(repository.ensureSettings).toHaveBeenCalledWith('biz-1');
    expect(result).toEqual({ waitingStatusEnabled: true });
  });

  it('updates waitingStatusEnabled and writes audit log', async () => {
    const actor = { id: 'user-1' } as never;
    const result = await service.updateSettings(
      'biz-1',
      { waitingStatusEnabled: false },
      actor,
    );

    expect(repository.upsert).toHaveBeenCalledWith('biz-1', {
      waitingStatusEnabled: false,
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'waiting_room_settings.updated',
        entityType: 'BusinessWaitingRoomSettings',
      }),
    );
    expect(result).toEqual({ waitingStatusEnabled: false });
  });

  it('reports isWaitingStatusEnabled from repository', async () => {
    await expect(service.isWaitingStatusEnabled('biz-1')).resolves.toBe(true);
  });
});
