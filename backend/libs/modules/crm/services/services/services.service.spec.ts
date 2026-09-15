import { HttpStatus } from '@nestjs/common';
import { ServiceCommissionType, ServiceStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ServicesService } from './services.service';

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    id: 'svc-a',
    businessId: 'biz',
    categoryId: 'cat-1',
    name: 'Cut',
    description: null,
    price: null,
    durationMinutes: 60,
    sortOrder: 0,
    isDemo: false,
    hasProcessingTime: false,
    processingDurationMinutes: 0,
    finishDurationMinutes: null,
    hasBufferTime: false,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    usesProducts: false,
    requiresNoStaff: false,
    requiresTwoStaff: false,
    hasCommissionDeduction: false,
    commissionDeductionType: null as ServiceCommissionType | null,
    commissionDeductionValue: null,
    status: ServiceStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    category: { id: 'cat-1', name: 'Hair' },
    ...overrides,
  };
}

describe('ServicesService', () => {
  const serviceRepository = {
    findByIdWithCategory: jest.fn(),
    findMany: jest.fn(),
    findManyOrderedByCategory: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    reorderInCategory: jest.fn(),
  };
  const workspaceRepository = {
    nextServiceSortOrder: jest.fn(),
    createOnlineBookingSettings: jest.fn(),
  };
  const categoriesService = {
    list: jest.fn(),
    getOrCreateDefaultCategory: jest.fn(),
  };
  const auditService = { log: jest.fn() };

  const service = new ServicesService(
    serviceRepository as never,
    workspaceRepository as never,
    categoriesService as never,
    auditService as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('reorders services within a category', async () => {
    categoriesService.list.mockResolvedValue([{ id: 'cat-1', name: 'Hair' }]);
    const existing = [
      makeService({ id: 'svc-a', sortOrder: 0 }),
      makeService({ id: 'svc-b', name: 'Trim', sortOrder: 1 }),
    ];
    serviceRepository.findManyOrderedByCategory.mockResolvedValue(existing);
    serviceRepository.reorderInCategory.mockResolvedValue([
      makeService({ id: 'svc-b', name: 'Trim', sortOrder: 0 }),
      makeService({ id: 'svc-a', sortOrder: 1 }),
    ]);

    const result = await service.reorder(
      'biz',
      { categoryId: 'cat-1', orderedIds: ['svc-b', 'svc-a'] },
      { id: 'user-1' } as never,
    );

    expect(serviceRepository.reorderInCategory).toHaveBeenCalledWith(
      'biz',
      'cat-1',
      ['svc-b', 'svc-a'],
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'service.reordered' }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('svc-b');
  });

  it('rejects incomplete orderedIds', async () => {
    categoriesService.list.mockResolvedValue([{ id: 'cat-1', name: 'Hair' }]);
    serviceRepository.findManyOrderedByCategory.mockResolvedValue([
      makeService({ id: 'svc-a' }),
      makeService({ id: 'svc-b' }),
    ]);

    await expect(
      service.reorder(
        'biz',
        { categoryId: 'cat-1', orderedIds: ['svc-a'] },
        { id: 'user-1' } as never,
      ),
    ).rejects.toBeInstanceOf(AppException);

    try {
      await service.reorder(
        'biz',
        { categoryId: 'cat-1', orderedIds: ['svc-a'] },
        { id: 'user-1' } as never,
      );
    } catch (err) {
      expect((err as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });
});
