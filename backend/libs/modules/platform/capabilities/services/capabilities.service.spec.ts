import { HttpStatus } from '@nestjs/common';
import { CapabilityStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { CapabilitiesService } from './capabilities.service';

describe('CapabilitiesService lifecycle', () => {
  const actor = { id: 'user-1', email: 'admin@example.com' };

  function buildService() {
    const repository = {
      findById: jest.fn(),
      findByKey: jest.fn(),
      findMany: jest.fn(),
      getStats: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      hardDelete: jest.fn(),
    };
    const validation = { validateKey: jest.fn() };
    const auditService = { log: jest.fn() };

    const service = new CapabilitiesService(
      repository as never,
      validation as never,
      auditService as never,
    );

    return { service, repository, validation, auditService };
  }

  const baseCapability = {
    id: 'cap-1',
    key: 'crm',
    name: 'CRM',
    description: null,
    icon: null,
    status: CapabilityStatus.ACTIVE,
    sortOrder: 10,
    metadata: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      moduleAssignments: 2,
      featureAssignments: 4,
      permissions: 5,
      limits: 2,
      navigationItems: 3,
      configSchemas: 0,
    },
  };

  it('remove permanently deletes capability via repository', async () => {
    const { service, repository, auditService } = buildService();
    repository.findById.mockResolvedValue(baseCapability);
    repository.hardDelete.mockResolvedValue(baseCapability);

    await service.remove('cap-1', actor as never);
    expect(repository.hardDelete).toHaveBeenCalledWith('cap-1');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'platform.capability.deleted' }),
    );
  });

  it('deprecate sets DEPRECATED without soft delete', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(baseCapability);
    repository.findById.mockResolvedValueOnce(baseCapability);
    repository.findById.mockResolvedValueOnce({
      ...baseCapability,
      status: CapabilityStatus.DEPRECATED,
    });
    repository.update.mockResolvedValue({
      ...baseCapability,
      status: CapabilityStatus.DEPRECATED,
    });

    const result = await service.deprecate('cap-1', actor as never);
    expect(repository.update).toHaveBeenCalledWith('cap-1', {
      status: CapabilityStatus.DEPRECATED,
    });
    expect(result.status).toBe(CapabilityStatus.DEPRECATED);
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  it('activate clears deletedAt and sets ACTIVE', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(baseCapability);
    repository.update.mockResolvedValue(baseCapability);

    await service.activate('cap-1', actor as never);
    expect(repository.update).toHaveBeenCalledWith('cap-1', {
      status: CapabilityStatus.ACTIVE,
      deletedAt: null,
    });
  });

  it('create auto-generates key from name when omitted', async () => {
    const { service, repository, validation } = buildService();
    repository.findByKey.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: 'cap-new', key: 'whatsapp_crm' });
    repository.findById.mockResolvedValue({
      ...baseCapability,
      id: 'cap-new',
      key: 'whatsapp_crm',
      name: 'WhatsApp CRM',
    });

    await service.create({ name: 'WhatsApp CRM' }, actor as never);

    expect(validation.validateKey).toHaveBeenCalledWith('whatsapp_crm');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'whatsapp_crm',
        name: 'WhatsApp CRM',
        icon: null,
        sortOrder: 0,
      }),
    );
  });

  it('create appends suffix when generated key already exists', async () => {
    const { service, repository } = buildService();
    repository.findByKey
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce(null);
    repository.create.mockResolvedValue({ id: 'cap-new', key: 'crm_2' });
    repository.findById.mockResolvedValue({
      ...baseCapability,
      id: 'cap-new',
      key: 'crm_2',
      name: 'CRM',
    });

    await service.create({ name: 'CRM' }, actor as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'crm_2' }),
    );
  });

  it('get throws NOT_FOUND when missing', async () => {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(null);

    await expect(service.get('missing')).rejects.toBeInstanceOf(AppException);
    try {
      await service.get('missing');
    } catch (err) {
      expect((err as AppException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });
});
