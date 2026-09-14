import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { resolveServiceTiming } from '@app/modules/crm/services/utils/service-timing.util';
import { AppointmentRepository } from '../repositories/appointment.repository';
import {
  appointmentBlocksOverlap,
  resolveAppointmentBlockingWindow,
} from '../utils/appointment-blocking.util';
import {
  mergeAssignmentQuantities,
  resolveRequiredResources,
  resourceCapacityExceeded,
  type AllocatableResource,
  type ResourceAssignmentQuantity,
  type ResourceRequirementInput,
} from '../utils/appointment-resource-allocation.util';

export const RESOURCE_SCHEDULE_CONFLICT_MESSAGE =
  'A required resource is already booked during this time';
export const RESOURCE_UNFULFILLABLE_MESSAGE =
  'A required resource is not available for this service';

export type AppointmentResourceAllocationLine = {
  serviceId: string;
  startAt: Date;
  durationMinutes?: number | null;
  endAt?: Date | null;
};

@Injectable()
export class AppointmentResourceAllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentRepository: AppointmentRepository,
  ) {}

  async allocateForCreate(params: {
    businessId: string;
    lines: AppointmentResourceAllocationLine[];
    conflictCode: ErrorCode;
    excludeAppointmentId?: string;
  }): Promise<ResourceAssignmentQuantity[]> {
    const lines = params.lines.filter((line) => line.serviceId && line.startAt);
    if (lines.length === 0) {
      return [];
    }

    const serviceIds = [...new Set(lines.map((line) => line.serviceId))];
    const requirements = await this.prisma.serviceResourceRequirement.findMany({
      where: {
        businessId: params.businessId,
        serviceId: { in: serviceIds },
      },
      include: { items: { select: { resourceId: true } } },
    });

    if (requirements.length === 0) {
      return [];
    }

    const { groupMembersByGroupId, resourcesById } =
      await this.loadRequirementResources(params.businessId, requirements);

    const services = await this.prisma.service.findMany({
      where: { businessId: params.businessId, id: { in: serviceIds } },
      select: {
        id: true,
        durationMinutes: true,
        hasProcessingTime: true,
        processingDurationMinutes: true,
        finishDurationMinutes: true,
        hasBufferTime: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
      },
    });
    const servicesById = new Map(services.map((service) => [service.id, service]));

    const pending: ResourceAssignmentQuantity[] = [];

    for (const line of lines) {
      const lineRequirements = requirements.filter(
        (requirement) => requirement.serviceId === line.serviceId,
      );
      if (lineRequirements.length === 0) {
        continue;
      }

      const resolved = resolveRequiredResources({
        requirements: lineRequirements.map(this.toRequirementInput),
        groupMembersByGroupId,
        resourcesById,
      });
      if (!resolved.ok) {
        throw this.conflictException(params.conflictCode, 'unfulfillable');
      }
      if (resolved.assignments.length === 0) {
        continue;
      }

      const candidate = this.resolveLineWindow(line, servicesById.get(line.serviceId));

      for (const assignment of resolved.assignments) {
        const resource = resourcesById[assignment.resourceId];
        if (!resource) {
          throw this.conflictException(params.conflictCode, 'unfulfillable');
        }

        if (resource.capacity != null) {
          const blocking =
            await this.appointmentRepository.findResourceBlockingInRange(
              params.businessId,
              assignment.resourceId,
              candidate.blockStart,
              candidate.blockEnd,
              params.excludeAppointmentId,
            );
          const overlappingUsedQuantity = blocking
            .filter((existing) =>
              appointmentBlocksOverlap(
                resolveAppointmentBlockingWindow(existing),
                candidate,
              ),
            )
            .reduce((sum, existing) => sum + existing.usedQuantity, 0);

          if (
            resourceCapacityExceeded({
              capacity: resource.capacity,
              requestedQuantity: assignment.quantity,
              overlappingUsedQuantity,
            })
          ) {
            throw this.conflictException(params.conflictCode, 'busy');
          }
        }

        pending.push(assignment);
      }
    }

    return mergeAssignmentQuantities(pending);
  }

  private toRequirementInput(requirement: {
    serviceId: string;
    selectionMode: string;
    groupId: string | null;
    resourceId: string | null;
    quantity: number;
    items: Array<{ resourceId: string }>;
  }): ResourceRequirementInput {
    return {
      serviceId: requirement.serviceId,
      selectionMode: requirement.selectionMode,
      groupId: requirement.groupId,
      resourceId: requirement.resourceId,
      quantity: requirement.quantity,
      items: requirement.items,
    };
  }

  private async loadRequirementResources(
    businessId: string,
    requirements: Array<{
      selectionMode: string;
      groupId: string | null;
      resourceId: string | null;
      items: Array<{ resourceId: string }>;
    }>,
  ): Promise<{
    groupMembersByGroupId: Record<string, AllocatableResource[]>;
    resourcesById: Record<string, AllocatableResource>;
  }> {
    const groupIds = [
      ...new Set(
        requirements
          .filter((requirement) => requirement.selectionMode === 'ALL')
          .map((requirement) => requirement.groupId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const specificIds = [
      ...new Set(
        requirements.flatMap((requirement) => [
          ...requirement.items.map((item) => item.resourceId),
          requirement.resourceId,
        ]).filter((id): id is string => Boolean(id)),
      ),
    ];

    const [groupMembers, specificResources] = await Promise.all([
      groupIds.length > 0
        ? this.prisma.resource.findMany({
            where: {
              businessId,
              groupId: { in: groupIds },
              deletedAt: null,
              status: 'ACTIVE',
            },
            select: {
              id: true,
              groupId: true,
              status: true,
              deletedAt: true,
              capacity: true,
            },
          })
        : Promise.resolve([]),
      specificIds.length > 0
        ? this.prisma.resource.findMany({
            where: { businessId, id: { in: specificIds } },
            select: {
              id: true,
              groupId: true,
              status: true,
              deletedAt: true,
              capacity: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const groupMembersByGroupId: Record<string, AllocatableResource[]> = {};
    for (const member of groupMembers) {
      const groupId = member.groupId;
      if (!groupId) continue;
      if (!groupMembersByGroupId[groupId]) {
        groupMembersByGroupId[groupId] = [];
      }
      groupMembersByGroupId[groupId].push(member);
    }

    const resourcesById: Record<string, AllocatableResource> = {};
    for (const resource of [...groupMembers, ...specificResources]) {
      resourcesById[resource.id] = resource;
    }

    return { groupMembersByGroupId, resourcesById };
  }

  private resolveLineWindow(
    line: AppointmentResourceAllocationLine,
    service:
      | {
          durationMinutes: number;
          hasProcessingTime: boolean;
          processingDurationMinutes: number;
          finishDurationMinutes: number | null;
          hasBufferTime: boolean;
          bufferBeforeMinutes: number;
          bufferAfterMinutes: number;
        }
      | undefined,
  ) {
    const timing = service
      ? resolveServiceTiming(service)
      : {
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          clientOccupancyMinutes: line.durationMinutes ?? 0,
        };
    const occupancyMinutes =
      line.durationMinutes ?? timing.clientOccupancyMinutes;
    const lineEnd =
      line.endAt ??
      new Date(line.startAt.getTime() + occupancyMinutes * 60_000);

    return resolveAppointmentBlockingWindow(
      { startAt: line.startAt, endAt: lineEnd },
      {
        bufferBeforeMinutes: timing.bufferBeforeMinutes,
        bufferAfterMinutes: timing.bufferAfterMinutes,
      },
    );
  }

  private conflictException(
    code: ErrorCode,
    kind: 'busy' | 'unfulfillable',
  ): AppException {
    if (code === ErrorCode.BOOKING_SLOT_UNAVAILABLE) {
      return new AppException(
        code,
        'This time slot is no longer available',
        HttpStatus.CONFLICT,
      );
    }
    return new AppException(
      code,
      kind === 'unfulfillable'
        ? RESOURCE_UNFULFILLABLE_MESSAGE
        : RESOURCE_SCHEDULE_CONFLICT_MESSAGE,
      HttpStatus.CONFLICT,
    );
  }
}
