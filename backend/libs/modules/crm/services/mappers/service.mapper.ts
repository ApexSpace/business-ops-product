import { Service } from '@prisma/client';
import { ServiceResponseDto } from '../dto/service-response.dto';

export function toServiceResponse(service: Service): ServiceResponseDto {
  return {
    id: service.id,
    businessId: service.businessId,
    name: service.name,
    category: service.category,
    description: service.description,
    price: service.price?.toString() ?? null,
    status: service.status,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}
