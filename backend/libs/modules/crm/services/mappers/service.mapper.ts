import { ServiceWithCategory } from '../repositories/service.repository';
import { ServiceResponseDto } from '../dto/service-response.dto';
import {
  resolveServiceTiming,
  type ServiceTimingFields,
} from '../utils/service-timing.util';
import { resolveStaffingMode } from '../utils/service-staffing.util';

export function toServiceTimingFields(
  service: ServiceWithCategory | ServiceTimingFields,
): ServiceTimingFields {
  return {
    durationMinutes: service.durationMinutes,
    hasProcessingTime: service.hasProcessingTime,
    processingDurationMinutes: service.processingDurationMinutes,
    finishDurationMinutes: service.finishDurationMinutes,
    hasBufferTime: service.hasBufferTime,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
  };
}

export function toServiceResponse(
  service: ServiceWithCategory,
): ServiceResponseDto {
  const timing = resolveServiceTiming(toServiceTimingFields(service));
  return {
    id: service.id,
    businessId: service.businessId,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    name: service.name,
    description: service.description,
    price: service.price?.toString() ?? null,
    durationMinutes: service.durationMinutes,
    sortOrder: service.sortOrder,
    isDemo: service.isDemo,
    hasProcessingTime: service.hasProcessingTime,
    processingDurationMinutes: service.processingDurationMinutes,
    finishDurationMinutes: service.finishDurationMinutes,
    hasBufferTime: service.hasBufferTime,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
    usesProducts: service.usesProducts,
    requiresNoStaff: service.requiresNoStaff,
    requiresTwoStaff: service.requiresTwoStaff,
    hasCommissionDeduction: service.hasCommissionDeduction,
    commissionDeductionType: service.commissionDeductionType,
    commissionDeductionValue:
      service.commissionDeductionValue?.toString() ?? null,
    postCommissionDeductionType: service.postCommissionDeductionType,
    postCommissionDeductionValue:
      service.postCommissionDeductionValue?.toString() ?? null,
    staffingMode: resolveStaffingMode(service),
    clientOccupancyMinutes: timing.clientOccupancyMinutes,
    staffBlockedMinutes: timing.staffBlockedMinutes,
    status: service.status,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}
