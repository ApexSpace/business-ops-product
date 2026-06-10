import { CapabilityFeatureStatus } from '@prisma/client';
import { CapabilityRepository } from './capability.repository';

describe('CapabilityRepository batch assignments', () => {
  function buildRepository() {
    const tx = {
      capabilityFeatureAssignment: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
      },
      capabilityModuleAssignment: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new CapabilityRepository(prisma as never);
    return { repository, tx, prisma };
  }

  it('assignFeatures uses createMany for new keys and updateMany to restore soft-deleted rows', async () => {
    const { repository, tx } = buildRepository();
    tx.capabilityFeatureAssignment.findMany.mockResolvedValue([
      { featureKey: 'contacts.list' },
    ]);

    await repository.assignFeatures('cap-1', [
      'contacts.list',
      'contacts.create',
      'contacts.workspace',
    ]);

    expect(tx.capabilityFeatureAssignment.createMany).toHaveBeenCalledWith({
      data: [
        {
          capabilityId: 'cap-1',
          featureKey: 'contacts.create',
          status: CapabilityFeatureStatus.ACTIVE,
          sortOrder: 1,
        },
        {
          capabilityId: 'cap-1',
          featureKey: 'contacts.workspace',
          status: CapabilityFeatureStatus.ACTIVE,
          sortOrder: 2,
        },
      ],
    });
    expect(tx.capabilityFeatureAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        capabilityId: 'cap-1',
        featureKey: { in: ['contacts.list'] },
      },
      data: {
        deletedAt: null,
        status: CapabilityFeatureStatus.ACTIVE,
      },
    });
  });

  it('assignFeatures skips transaction when no keys are provided', async () => {
    const { repository, prisma } = buildRepository();

    await repository.assignFeatures('cap-1', []);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('assignModules uses createMany for new keys and updateMany to restore soft-deleted rows', async () => {
    const { repository, tx } = buildRepository();
    tx.capabilityModuleAssignment.findMany.mockResolvedValue([
      { moduleKey: 'contacts' },
    ]);

    await repository.assignModules('cap-1', ['contacts', 'payments']);

    expect(tx.capabilityModuleAssignment.createMany).toHaveBeenCalledWith({
      data: [{ capabilityId: 'cap-1', moduleKey: 'payments' }],
    });
    expect(tx.capabilityModuleAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        capabilityId: 'cap-1',
        moduleKey: { in: ['contacts'] },
      },
      data: { deletedAt: null },
    });
  });
});
