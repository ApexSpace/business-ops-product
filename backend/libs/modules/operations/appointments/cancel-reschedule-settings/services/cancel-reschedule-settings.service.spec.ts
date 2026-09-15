import {
  SelfCancellationMode,
  SelfRescheduleMode,
} from '@prisma/client';
import { CancelRescheduleSettingsService } from './cancel-reschedule-settings.service';

describe('CancelRescheduleSettingsService', () => {
  const settingsRow = {
    id: 'crs-1',
    businessId: 'biz-1',
    cancellationPolicyHtml: '<p>Policy</p>',
    cancellationPolicySms: 'Short policy',
    requirePolicyAgreement: false,
    selfCancellationMode: SelfCancellationMode.DISABLED,
    selfCancellationMinutes: 15,
    selfCancellationHoursBefore: 24,
    selfRescheduleMode: SelfRescheduleMode.DISABLED,
    selfRescheduleHoursBefore: 24,
    lateCancellationHoursBefore: 24,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let repository: {
    ensureSettings: jest.Mock;
    upsert: jest.Mock;
  };
  let auditService: { log: jest.Mock };
  let service: CancelRescheduleSettingsService;

  beforeEach(() => {
    repository = {
      ensureSettings: jest.fn().mockResolvedValue(settingsRow),
      upsert: jest.fn().mockResolvedValue(settingsRow),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    service = new CancelRescheduleSettingsService(
      repository as never,
      auditService as never,
    );
  });

  it('returns settings on getSettings', async () => {
    const result = await service.getSettings('biz-1');
    expect(repository.ensureSettings).toHaveBeenCalledWith('biz-1');
    expect(result.cancellationPolicyHtml).toBe('<p>Policy</p>');
  });

  it('rejects SMS policy longer than 215 characters', async () => {
    const actor = { id: 'user-1' } as never;
    await expect(
      service.updateCancellationPolicy(
        'biz-1',
        { cancellationPolicySms: 'x'.repeat(216) },
        actor,
      ),
    ).rejects.toThrow('SMS policy must be 215 characters or fewer');
  });

  it('updates late cancellation hours and writes audit log', async () => {
    const actor = { id: 'user-1' } as never;
    await service.updateLateCancellation(
      'biz-1',
      { lateCancellationHoursBefore: 48 },
      actor,
    );

    expect(repository.upsert).toHaveBeenCalledWith('biz-1', {
      lateCancellationHoursBefore: 48,
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'cancel_reschedule_settings.updated',
      }),
    );
  });
});
