import { SnapshotStatus } from '@prisma/client';
import { SNAPSHOT_SEED_DEFINITIONS } from '../seeds/snapshot-seed-definitions';
import { DEFAULT_SNAPSHOT_CONTEXT } from '../constants/default-snapshot-context';
import { SnapshotContextService } from './snapshot-context.service';

describe('SnapshotContextService', () => {
  it('returns default context when business has no snapshot', async () => {
    const prisma = {
      business: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'biz-1',
          snapshot: null,
        }),
      },
    };
    const service = new SnapshotContextService(prisma as never);
    const result = await service.getForBusiness('biz-1');
    expect(result.snapshotId).toBeNull();
    expect(result.snapshotName).toBe(DEFAULT_SNAPSHOT_CONTEXT.snapshotName);
    expect(result.dashboard.widgets).toEqual([]);
    expect(result).not.toHaveProperty('crm');
  });

  it('returns lightweight published snapshot context', async () => {
    const assets = SNAPSHOT_SEED_DEFINITIONS[0].assets;
    const prisma = {
      business: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'biz-1',
          snapshot: {
            id: 'snap-1',
            name: 'Default Business Snapshot',
            status: SnapshotStatus.PUBLISHED,
            deletedAt: null,
            updatedAt: new Date('2026-06-07T12:00:00.000Z'),
            assets,
          },
        }),
      },
    };
    const service = new SnapshotContextService(prisma as never);
    const result = await service.getForBusiness('biz-1');

    expect(result.snapshotId).toBe('snap-1');
    expect(result.navigation.length).toBeGreaterThan(0);
    expect(result.dashboard.widgets.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('crm');
    expect(result).not.toHaveProperty('emails');
    expect(result.contextVersion).toBe('2026-06-07T12:00:00.000Z');
  });

  it('falls back when snapshot is draft', async () => {
    const prisma = {
      business: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'biz-1',
          snapshot: {
            id: 'snap-1',
            name: 'Draft',
            status: SnapshotStatus.DRAFT,
            deletedAt: null,
            updatedAt: new Date(),
            assets: SNAPSHOT_SEED_DEFINITIONS[0].assets,
          },
        }),
      },
    };
    const service = new SnapshotContextService(prisma as never);
    const result = await service.getForBusiness('biz-1');
    expect(result.snapshotId).toBeNull();
  });
});
