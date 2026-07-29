import {
  BusinessLifecycleStage,
  BusinessStatus,
  BusinessType,
} from '@prisma/client';
import { BusinessLifecycleService } from './business-lifecycle.service';

describe('BusinessLifecycleService', () => {
  const prisma = {
    pipelineStage: { findFirst: jest.fn() },
    pipeline: { findFirst: jest.fn() },
    business: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const provisioning = {
    provisionAccess: jest.fn().mockResolvedValue(undefined),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new BusinessLifecycleService(
    prisma as never,
    provisioning as never,
    auditService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createFromLead creates TENANT LEAD without provisioning', async () => {
    prisma.pipelineStage.findFirst.mockResolvedValue({
      id: 'stage-1',
      pipelineId: 'pipe-1',
      businessId: 'ops-1',
      mapsToLifecycleStage: BusinessLifecycleStage.LEAD,
    });
    prisma.business.create.mockResolvedValue({
      id: 'biz-1',
      name: 'Acme Lead',
      lifecycleStage: BusinessLifecycleStage.LEAD,
    });

    const result = await service.createFromLead({
      opsBusinessId: 'ops-1',
      pipelineId: 'pipe-1',
      pipelineStageId: 'stage-1',
      name: 'Acme Lead',
      email: 'a@example.com',
    });

    expect(result.id).toBe('biz-1');
    expect(prisma.business.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: BusinessType.TENANT,
          status: BusinessStatus.NOT_ACTIVE,
          lifecycleStage: BusinessLifecycleStage.LEAD,
          lifecyclePipelineId: 'pipe-1',
          lifecyclePipelineStageId: 'stage-1',
        }),
      }),
    );
    expect(provisioning.provisionAccess).not.toHaveBeenCalled();
  });

  it('moveLifecycleStage to ACTIVE provisions access', async () => {
    prisma.business.findFirst
      .mockResolvedValueOnce({
        id: 'biz-1',
        type: BusinessType.TENANT,
        lifecycleStage: BusinessLifecycleStage.LEAD,
        lifecyclePipelineId: 'pipe-1',
        lifecyclePipelineStageId: 'stage-1',
      })
      .mockResolvedValueOnce({ name: 'Acme Lead' });
    prisma.pipelineStage.findFirst.mockResolvedValue({
      id: 'stage-paid',
      pipelineId: 'pipe-1',
      mapsToLifecycleStage: BusinessLifecycleStage.ACTIVE,
      pipeline: { id: 'pipe-1', businessId: 'ops-1' },
      business: { type: BusinessType.INTERNAL },
    });
    prisma.business.update.mockResolvedValue({
      id: 'biz-1',
      lifecycleStage: BusinessLifecycleStage.ACTIVE,
    });

    await service.moveLifecycleStage({
      businessId: 'biz-1',
      pipelineStageId: 'stage-paid',
    });

    expect(provisioning.provisionAccess).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ accessMode: 'ACTIVE' }),
    );
  });
});
