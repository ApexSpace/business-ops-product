import { ProductCategory } from '@prisma/client';
import { ProductCategoryResponseDto } from '../dto/product-category.dto';

export function toProductCategoryResponse(
  category: ProductCategory,
): ProductCategoryResponseDto {
  return {
    id: category.id,
    businessId: category.businessId,
    name: category.name,
    isNonRetail: category.isNonRetail,
    sortOrder: category.sortOrder,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
