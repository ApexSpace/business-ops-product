import {
  CapabilityFeatureSource,
  CapabilityFeatureStatus,
} from '@prisma/client';
import { REGISTRY_FEATURES } from '../registries/capability-feature.registry';
import { CapabilityRegistrySyncService } from './capability-registry-sync.service';

describe('CapabilityRegistrySyncService', () => {
  const actor = { id: 'user-1', email: 'admin@example.com' };
  const sampleDef = REGISTRY_FEATURES.find(
    (f) => f.featureKey === 'contacts.list',
  )!;

  function buildService(dbFeatures: unknown[] = []) {
    const repository = {
      findAllRegistryFeatures: jest.fn().mockResolvedValue(dbFeatures),
      upsertCodeRegistryFeature: jest.fn().mockResolvedValue({
        id: 'rf-1',
        key: sampleDef.featureKey,
        source: CapabilityFeatureSource.CODE,
        status: CapabilityFeatureStatus.ACTIVE,
      }),
    };
    const auditService = { log: jest.fn() };

    const service = new CapabilityRegistrySyncService(
      repository as never,
      auditService as never,
    );

    return { service, repository, auditService };
  }

  it('dry run does not write to database', async () => {
    const { service, repository } = buildService();
    const report = await service.sync({ dryRun: true }, actor as never);
    expect(repository.upsertCodeRegistryFeature).not.toHaveBeenCalled();
    expect(report.dryRun).toBe(true);
    expect(report.missingInDb.length).toBeGreaterThan(0);
  });

  it('upserts CODE registry features on sync', async () => {
    const { service, repository } = buildService([]);
    const report = await service.sync({ dryRun: false }, actor as never);
    expect(repository.upsertCodeRegistryFeature).toHaveBeenCalled();
    expect(report.synced.some((entry) => entry.key === 'contacts.list')).toBe(
      true,
    );
  });

  it('preserves MANUAL registry features during sync', async () => {
    const { service, repository } = buildService([
      {
        id: 'rf-manual',
        key: 'contacts.list',
        name: 'Manual Contacts',
        moduleKey: 'contacts',
        moduleName: 'Contacts',
        source: CapabilityFeatureSource.MANUAL,
        status: CapabilityFeatureStatus.ACTIVE,
        defaultEnabled: false,
        isBillable: false,
      },
    ]);

    const report = await service.sync({ dryRun: false }, actor as never);
    expect(repository.upsertCodeRegistryFeature).not.toHaveBeenCalledWith(
      'contacts.list',
      expect.anything(),
      expect.anything(),
    );
    expect(
      report.warnings.some((w) =>
        w.includes('MANUAL registry feature contacts.list'),
      ),
    ).toBe(true);
  });

  it('reports drift when CODE feature name differs', async () => {
    const { service } = buildService([
      {
        id: 'rf-1',
        key: 'contacts.list',
        name: 'Old Name',
        moduleKey: 'contacts',
        moduleName: 'Contacts',
        source: CapabilityFeatureSource.CODE,
        status: CapabilityFeatureStatus.ACTIVE,
        defaultEnabled: true,
        isBillable: false,
      },
    ]);

    const report = await service.sync({ dryRun: true }, actor as never);
    expect(report.drifted.some((d) => d.key === 'contacts.list')).toBe(true);
  });
});
