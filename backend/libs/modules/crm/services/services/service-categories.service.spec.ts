import { HttpStatus } from '@nestjs/common';
import { ServiceStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ServiceCategoriesService } from './service-categories.service';

describe('ServiceCategoriesService', () => {
  const categoryRepository = {
    findManyOrdered: jest.fn(),
    nextSortOrder: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    countActiveServices: jest.fn(),
    softDelete: jest.fn(),
    reorder: jest.fn(),
  };
  const auditService = { log: jest.fn() };

  const service = new ServiceCategoriesService(
    categoryRepository as never,
    auditService as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a category with next sort order', async () => {
    categoryRepository.nextSortOrder.mockResolvedValue(2);
    categoryRepository.create.mockResolvedValue({
      id: 'cat-1',
      businessId: 'biz',
      name: 'Haircuts',
      description: null,
      sortOrder: 2,
      status: ServiceStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(
      'biz',
      { name: 'Haircuts' },
      { id: 'user-1' } as never,
    );

    expect(result.name).toBe('Haircuts');
    expect(categoryRepository.create).toHaveBeenCalled();
  });

  it('blocks delete when category has services', async () => {
    categoryRepository.findById.mockResolvedValue({
      id: 'cat-1',
      businessId: 'biz',
      name: 'Haircuts',
      sortOrder: 0,
      status: ServiceStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    categoryRepository.countActiveServices.mockResolvedValue(2);

    await expect(
      service.remove('biz', 'cat-1', { id: 'user-1' } as never),
    ).rejects.toBeInstanceOf(AppException);

    try {
      await service.remove('biz', 'cat-1', { id: 'user-1' } as never);
    } catch (err) {
      expect((err as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });
});
