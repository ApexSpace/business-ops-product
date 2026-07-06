import { HttpStatus, Injectable } from '@nestjs/common';
import { Calendar } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { ServiceWorkspaceRepository } from '../repositories/service-workspace.repository';
import { ServiceRepository } from '../repositories/service.repository';
import {
  mergeStaffTimingOverrides,
  resolveServiceTiming,
  type ResolvedServiceTiming,
  type ServiceTimingSegment,
} from '../utils/service-timing.util';

export type PublicBookingTimingContext = ResolvedServiceTiming & {
  slotDurationMinutes: number;
};

@Injectable()
export class ServiceBookingTimingService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly workspaceRepository: ServiceWorkspaceRepository,
  ) {}

  async resolveForBooking(params: {
    businessId: string;
    serviceId?: string;
    staffId?: string;
    calendar: Calendar;
  }): Promise<PublicBookingTimingContext | null> {
    if (!params.serviceId) {
      return null;
    }

    const service = await this.serviceRepository.findById(
      params.businessId,
      params.serviceId,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    let staffTiming: Partial<{
      durationMinutes: number;
      hasProcessingTime: boolean;
      processingDurationMinutes: number;
      finishDurationMinutes: number | null;
      hasBufferTime: boolean;
      bufferBeforeMinutes: number;
      bufferAfterMinutes: number;
    }> | null = null;

    if (params.staffId) {
      const assignment = await this.workspaceRepository.findStaffAssignment(
        params.businessId,
        params.serviceId,
        params.staffId,
      );
      if (assignment) {
        staffTiming = {
          durationMinutes: assignment.durationMinutes ?? undefined,
          hasProcessingTime: assignment.hasProcessingTime ?? undefined,
          processingDurationMinutes:
            assignment.processingDurationMinutes ?? undefined,
          finishDurationMinutes: assignment.finishDurationMinutes ?? undefined,
          hasBufferTime: assignment.hasBufferTime ?? undefined,
          bufferBeforeMinutes: assignment.bufferBeforeMinutes ?? undefined,
          bufferAfterMinutes: assignment.bufferAfterMinutes ?? undefined,
        };
      }
    }

    const merged = mergeStaffTimingOverrides(
      {
        durationMinutes: service.durationMinutes,
        hasProcessingTime: service.hasProcessingTime,
        processingDurationMinutes: service.processingDurationMinutes,
        finishDurationMinutes: service.finishDurationMinutes,
        hasBufferTime: service.hasBufferTime,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
      },
      staffTiming,
    );

    const resolved = resolveServiceTiming(merged, {
      bufferBeforeMinutes: params.calendar.bufferBeforeMinutes,
      bufferAfterMinutes: params.calendar.bufferAfterMinutes,
    });

    return {
      ...resolved,
      slotDurationMinutes: resolved.staffBlockedMinutes,
    };
  }

  buildAppointmentMetadata(params: {
    timing: PublicBookingTimingContext;
    service: {
      usesProducts: boolean;
      requiresNoStaff: boolean;
      requiresTwoStaff: boolean;
    };
    productUsageIds: string[];
    secondaryStaffId?: string | null;
  }) {
    return {
      serviceTiming: {
        segments: params.timing.segments,
        staffBlockedMinutes: params.timing.staffBlockedMinutes,
        clientOccupancyMinutes: params.timing.clientOccupancyMinutes,
        bufferBeforeMinutes: params.timing.hasBufferTime
          ? params.timing.bufferBeforeMinutes
          : null,
        bufferAfterMinutes: params.timing.hasBufferTime
          ? params.timing.bufferAfterMinutes
          : null,
      },
      serviceAdvanced: {
        usesProducts: params.service.usesProducts,
        productUsageIds: params.productUsageIds,
        staffingMode: params.service.requiresNoStaff
          ? 'RESOURCE_ONLY'
          : params.service.requiresTwoStaff
            ? 'TWO_STAFF'
            : 'SINGLE_STAFF',
        secondaryStaffId: params.secondaryStaffId ?? null,
      },
    };
  }
}
