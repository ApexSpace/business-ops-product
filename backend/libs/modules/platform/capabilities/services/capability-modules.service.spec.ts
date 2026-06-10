import { CapabilityModulesService } from './capability-modules.service';

describe('CapabilityModulesService', () => {
  const actor = { id: 'user-1', email: 'admin@example.com' };

  function buildService() {
    const repository = {
      findModuleAssignments: jest.fn().mockResolvedValue([]),
      findModuleAssignment: jest.fn().mockResolvedValue(null),
      findAssignedFeatureKeys: jest.fn().mockResolvedValue([]),
      assignModules: jest.fn().mockResolvedValue([]),
      ensureCodeRegistryFeatures: jest.fn().mockResolvedValue(undefined),
      assignFeatures: jest.fn().mockResolvedValue([]),
      unassignModule: jest.fn().mockResolvedValue({ count: 1 }),
      unassignFeaturesByKeys: jest.fn().mockResolvedValue({ count: 2 }),
    };
    const capabilitiesService = {
      requireCapability: jest.fn().mockResolvedValue({ id: 'cap-1' }),
    };
    const auditService = { log: jest.fn() };

    const service = new CapabilityModulesService(
      repository as never,
      capabilitiesService as never,
      auditService as never,
    );

    return { service, repository, auditService };
  }

  it('lists flat module catalog from code registry with options', () => {
    const { service } = buildService();
    const catalog = service.listCatalog();
    const contacts = catalog.find((m) => m.moduleKey === 'contacts');
    expect(contacts).toBeDefined();
    expect(contacts?.availableOptions.map((o) => o.key)).toEqual(
      expect.arrayContaining([
        'contacts.list',
        'contacts.create',
        'contacts.workspace',
        'contacts.tags',
      ]),
    );
    expect(catalog.every((m) => m.featureCount > 0)).toBe(true);
    expect(catalog.every((m) => !('features' in m))).toBe(true);
    expect(catalog.map((m) => m.moduleKey)).not.toEqual(
      expect.arrayContaining(['forms', 'automation', 'email_marketing']),
    );
    const settings = catalog.find((m) => m.moduleKey === 'settings');
    expect(
      settings?.availableOptions.some((o) => o.key === 'settings.team'),
    ).toBe(true);
    const payments = catalog.find((m) => m.moduleKey === 'payments');
    expect(payments?.availableOptions.map((o) => o.key)).toEqual(
      expect.arrayContaining([
        'payments.estimates.list',
        'payments.invoices.list',
        'payments.transactions.list',
        'payments.refund',
        'payments.collect',
      ]),
    );
    const paymentGroups = [
      ...new Set(payments?.availableOptions.map((o) => o.group)),
    ];
    expect(paymentGroups).toEqual(
      expect.arrayContaining(['Estimates', 'Invoices', 'Transactions']),
    );
  });

  it('assigns module and auto-includes feature keys', async () => {
    const { service, repository } = buildService();
    const result = await service.assignModules(
      'cap-1',
      ['contacts', 'invalid'],
      actor as never,
    );

    expect(result.assigned).toEqual(['contacts']);
    expect(result.skipped).toEqual(['invalid']);
    expect(repository.assignModules).toHaveBeenCalledWith('cap-1', [
      'contacts',
    ]);
    expect(repository.ensureCodeRegistryFeatures).toHaveBeenCalledWith(
      expect.arrayContaining([
        'contacts.list',
        'contacts.create',
        'contacts.edit',
        'contacts.delete',
        'contacts.workspace',
      ]),
    );
    expect(repository.assignFeatures).toHaveBeenCalledWith(
      'cap-1',
      expect.arrayContaining(['contacts.list', 'contacts.workspace']),
    );
  });

  it('unassigns module and removes feature keys', async () => {
    const { service, repository } = buildService();
    repository.findModuleAssignment.mockResolvedValue({
      id: 'ma-1',
      moduleKey: 'contacts',
    });

    await service.unassignModule('cap-1', 'contacts', actor as never);
    expect(repository.unassignModule).toHaveBeenCalledWith('cap-1', 'contacts');
    expect(repository.unassignFeaturesByKeys).toHaveBeenCalledWith(
      'cap-1',
      expect.arrayContaining(['contacts.list']),
    );
  });

  it('syncs granular module options', async () => {
    const { service, repository } = buildService();
    repository.findModuleAssignments.mockResolvedValue([]);
    repository.findAssignedFeatureKeys.mockResolvedValue([]);

    await service.syncModules(
      'cap-1',
      [
        {
          moduleKey: 'contacts',
          options: {
            'contacts.list': true,
            'contacts.create': true,
            'contacts.edit': false,
            'contacts.delete': false,
          },
        },
      ],
      actor as never,
    );

    expect(repository.assignModules).toHaveBeenCalledWith('cap-1', [
      'contacts',
    ]);
    expect(repository.ensureCodeRegistryFeatures).toHaveBeenCalledWith(
      expect.arrayContaining(['contacts.list', 'contacts.create']),
    );
    expect(repository.assignFeatures).toHaveBeenCalledWith(
      'cap-1',
      expect.arrayContaining(['contacts.list', 'contacts.create']),
    );
    expect(repository.assignFeatures).not.toHaveBeenCalledWith(
      'cap-1',
      expect.arrayContaining(['contacts.delete']),
    );
  });

  it('derives options when listing assigned modules', async () => {
    const { service, repository } = buildService();
    repository.findModuleAssignments.mockResolvedValue([
      {
        moduleKey: 'contacts',
        createdAt: new Date('2026-01-01'),
      },
    ]);
    repository.findAssignedFeatureKeys.mockResolvedValue([
      'contacts.list',
      'contacts.create',
    ]);

    const assigned = await service.listAssigned('cap-1');
    expect(assigned).toHaveLength(1);
    expect(assigned[0].options['contacts.list']).toBe(true);
    expect(assigned[0].options['contacts.create']).toBe(true);
    expect(assigned[0].options['contacts.delete']).toBe(false);
    expect(assigned[0].enabled).toBe(true);
  });
});
