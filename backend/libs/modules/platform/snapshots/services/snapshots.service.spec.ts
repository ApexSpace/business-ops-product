import { HttpStatus } from '@nestjs/common';
import { SnapshotStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { SNAPSHOT_SEED_DEFINITIONS } from '../seeds/snapshot-seed-definitions';
import { SnapshotsService } from './snapshots.service';

describe('SnapshotsService lifecycle', () => {
  const actor = { id: 'user-1', email: 'admin@example.com' };

  function buildService() {
    const snapshotRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      countBusinesses: jest.fn().mockResolvedValue(0),
    };
    const validationService = {
      validateAndSanitize: jest.fn((assets) => assets),
    };
    const applyService = { apply: jest.fn() };
    const auditService = { log: jest.fn() };

    const service = new SnapshotsService(
      snapshotRepository as never,
      validationService,
      applyService as never,
      auditService as never,
    );

    return {
      service,
      snapshotRepository,
      validationService,
      applyService,
      auditService,
    };
  }

  it('publish validates assets and sets PUBLISHED', async () => {
    const { service, snapshotRepository, validationService } = buildService();
    const assets = SNAPSHOT_SEED_DEFINITIONS[0].assets;
    snapshotRepository.findById.mockResolvedValue({
      id: 'snap-1',
      name: 'Default',
      status: SnapshotStatus.DRAFT,
      assets,
    });
    snapshotRepository.update.mockResolvedValue({
      id: 'snap-1',
      name: 'Default',
      status: SnapshotStatus.PUBLISHED,
      assets,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.publish('snap-1', actor as never);
    expect(validationService.validateAndSanitize).toHaveBeenCalled();
    expect(result.status).toBe(SnapshotStatus.PUBLISHED);
  });

  it('archive rejects draft snapshots', async () => {
    const { service, snapshotRepository } = buildService();
    snapshotRepository.findById.mockResolvedValue({
      id: 'snap-1',
      status: SnapshotStatus.DRAFT,
      name: 'Draft',
      assets: {},
    });

    await expect(
      service.archive('snap-1', actor as never),
    ).rejects.toMatchObject({
      getStatus: expect.any(Function),
    });
    try {
      await service.archive('snap-1', actor as never);
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('clone creates a draft copy', async () => {
    const { service, snapshotRepository } = buildService();
    const assets = SNAPSHOT_SEED_DEFINITIONS[0].assets;
    snapshotRepository.findById.mockResolvedValue({
      id: 'snap-1',
      name: 'Default',
      description: 'desc',
      status: SnapshotStatus.PUBLISHED,
      assets,
    });
    snapshotRepository.create.mockResolvedValue({
      id: 'snap-2',
      name: 'Default (Copy)',
      description: 'desc',
      status: SnapshotStatus.DRAFT,
      assets,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.clone('snap-1', actor as never);
    expect(result.status).toBe(SnapshotStatus.DRAFT);
    expect(snapshotRepository.create).toHaveBeenCalled();
  });

  it('update can move PUBLISHED snapshot to DRAFT', async () => {
    const { service, snapshotRepository } = buildService();
    snapshotRepository.findById.mockResolvedValue({
      id: 'snap-1',
      name: 'Default',
      status: SnapshotStatus.PUBLISHED,
      assets: {},
      publishedAt: new Date(),
    });
    snapshotRepository.update.mockResolvedValue({
      id: 'snap-1',
      name: 'Default',
      status: SnapshotStatus.DRAFT,
      assets: {},
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update(
      'snap-1',
      { status: SnapshotStatus.DRAFT },
      actor as never,
    );

    expect(result.status).toBe(SnapshotStatus.DRAFT);
    expect(snapshotRepository.update).toHaveBeenCalledWith(
      'snap-1',
      expect.objectContaining({
        status: SnapshotStatus.DRAFT,
        publishedAt: null,
      }),
    );
  });
});
