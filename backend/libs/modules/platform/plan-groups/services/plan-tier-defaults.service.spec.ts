import { HttpStatus } from '@nestjs/common';
import { CapabilityStatus, PlanTierStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { PlanTierDefaultsService } from './plan-tier-defaults.service';

describe('PlanTierDefaultsService', () => {
  const prisma = {
    planTier: { findFirst: jest.fn() },
    planGroup: { findFirst: jest.fn() },
  } as unknown as ConstructorParameters<typeof PlanTierDefaultsService>[0];

  const service = new PlanTierDefaultsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tier defaults with active capabilities', async () => {
    (prisma.planTier.findFirst as jest.Mock).mockResolvedValue({
      id: 'tier-1',
      planGroupId: 'group-1',
      priceMonthly: '49.00',
      trialDays: 14,
      planGroup: {
        currency: 'USD',
        snapshotId: 'snap-1',
        snapshot: { id: 'snap-1', name: 'Starter' },
      },
      capabilities: [
        {
          capability: {
            key: 'crm',
            name: 'CRM',
            status: CapabilityStatus.ACTIVE,
          },
        },
      ],
    });

    const result = await service.getTierDefaults('group-1', 'tier-1');

    expect(result.amount).toBe('49.00');
    expect(result.currency).toBe('USD');
    expect(result.capabilities).toEqual([{ key: 'crm', name: 'CRM' }]);
    expect(result.suggestedSnapshotId).toBe('snap-1');
  });

  it('throws when tier is missing', async () => {
    (prisma.planTier.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.getTierDefaults('group-1', 'tier-1')).rejects.toBeInstanceOf(
      AppException,
    );
  });
});
