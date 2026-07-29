import { ServiceCategory } from '@prisma/client';
import { ServiceCategoryResponseDto } from '../dto/service-category.dto';

export function toServiceCategoryResponse(
  category: ServiceCategory,
): ServiceCategoryResponseDto {
  return {
    id: category.id,
    businessId: category.businessId,
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
