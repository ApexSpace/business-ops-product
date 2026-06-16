import { PlanGroupStatus } from '@prisma/client';
import { resolveWorkspacePlanGroupId } from './resolve-workspace-plan-group.util';

describe('resolveWorkspacePlanGroupId', () => {
  const prisma = {
    planGroup: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers the subscription plan group', async () => {
    const result = await resolveWorkspacePlanGroupId(prisma as never, {
      subscriptionPlanGroupId: 'group-sub',
      snapshotId: 'snap-1',
    });

    expect(result).toBe('group-sub');
    expect(prisma.planGroup.findFirst).not.toHaveBeenCalled();
  });

  it('falls back to a published snapshot plan group', async () => {
    prisma.planGroup.findFirst.mockResolvedValueOnce({ id: 'group-snap' });

    const result = await resolveWorkspacePlanGroupId(prisma as never, {
      subscriptionPlanGroupId: null,
      snapshotId: 'snap-1',
    });

    expect(result).toBe('group-snap');
    expect(prisma.planGroup.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          snapshotId: 'snap-1',
          status: PlanGroupStatus.PUBLISHED,
        }),
      }),
    );
  });

  it('falls back to the default published plan group', async () => {
    prisma.planGroup.findFirst.mockResolvedValueOnce(null);
    prisma.planGroup.findFirst.mockResolvedValueOnce({ id: 'group-default' });

    const result = await resolveWorkspacePlanGroupId(prisma as never, {
      subscriptionPlanGroupId: null,
      snapshotId: null,
    });

    expect(result).toBe('group-default');
  });
});
