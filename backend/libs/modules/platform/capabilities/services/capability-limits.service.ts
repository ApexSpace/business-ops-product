import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CapabilityLimitResponseDto,
  CreateCapabilityLimitDto,
  UpdateCapabilityLimitDto,
} from '../dto';
import { toCapabilityLimit } from '../mappers/capability.mapper';
import { CapabilityRepository } from '../repositories/capability.repository';
import { CapabilityValidationService } from './capability-validation.service';
import { CapabilitiesService } from './capabilities.service';

// TODO: Capability limits will move to Plan Tier Limits; keep service for API compatibility.
@Injectable()
export class CapabilityLimitsService {
  constructor(
    private readonly repository: CapabilityRepository,
    private readonly capabilitiesService: CapabilitiesService,
    private readonly validation: CapabilityValidationService,
    private readonly auditService: AuditService,
  ) {}

  async list(capabilityId: string): Promise<CapabilityLimitResponseDto[]> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const items = await this.repository.findLimits(capabilityId);
    return items.map(toCapabilityLimit);
  }

  async create(
    capabilityId: string,
    dto: CreateCapabilityLimitDto,
    actor: RequestUser,
  ): Promise<CapabilityLimitResponseDto> {
    await this.capabilitiesService.requireCapability(capabilityId);
    this.validation.validateKey(dto.key, 'limit key');

    const limit = await this.repository.createLimit({
      capability: { connect: { id: capabilityId } },
      key: dto.key,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      unit: dto.unit,
      defaultValue: dto.defaultValue,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.limit.created',
      entityType: 'CapabilityLimit',
      entityId: limit.id,
      metadata: { capabilityId, key: limit.key },
    });

    return toCapabilityLimit(limit);
  }

  async update(
    capabilityId: string,
    limitId: string,
    dto: UpdateCapabilityLimitDto,
    actor: RequestUser,
  ): Promise<CapabilityLimitResponseDto> {
    await this.requireLimit(capabilityId, limitId);

    const updated = await this.repository.updateLimit(limitId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() }
        : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.defaultValue !== undefined
        ? { defaultValue: dto.defaultValue }
        : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.limit.updated',
      entityType: 'CapabilityLimit',
      entityId: limitId,
      metadata: { capabilityId, changes: dto },
    });

    return toCapabilityLimit(updated);
  }

  async remove(
    capabilityId: string,
    limitId: string,
    actor: RequestUser,
  ): Promise<void> {
    const limit = await this.requireLimit(capabilityId, limitId);
    await this.repository.softDeleteLimit(limitId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.limit.archived',
      entityType: 'CapabilityLimit',
      entityId: limitId,
      metadata: { capabilityId, key: limit.key },
    });
  }

  private async requireLimit(capabilityId: string, limitId: string) {
    const limit = await this.repository.findLimitById(capabilityId, limitId);
    if (!limit) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Limit not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return limit;
  }
}
