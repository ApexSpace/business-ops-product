import { HttpStatus, Injectable } from '@nestjs/common';
import { CapabilityStatus, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  underscoreSlugify,
  withUnderscoreSuffix,
} from '@app/common/utils/slug.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CapabilityDetailDto,
  CapabilityListItemDto,
  CapabilityStatsDto,
  CreateCapabilityDto,
  UpdateCapabilityDto,
} from '../dto';
import {
  toCapabilityDetail,
  toCapabilityListItem,
} from '../mappers/capability.mapper';
import { CapabilityRepository } from '../repositories/capability.repository';
import { CapabilityValidationService } from './capability-validation.service';

@Injectable()
export class CapabilitiesService {
  constructor(
    private readonly repository: CapabilityRepository,
    private readonly validation: CapabilityValidationService,
    private readonly auditService: AuditService,
  ) {}

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    status?: CapabilityStatus;
    search?: string;
  }): Promise<{
    items: CapabilityListItemDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { items, total } = await this.repository.findMany(
      params.skip,
      params.limit,
      {
        status: params.status,
        search: params.search?.trim() || undefined,
      },
    );

    return {
      items: items.map(toCapabilityListItem),
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async getStats(): Promise<CapabilityStatsDto> {
    return this.repository.getStats();
  }

  async get(id: string): Promise<CapabilityDetailDto> {
    const capability = await this.requireCapability(id);
    return toCapabilityDetail(capability);
  }

  async create(
    dto: CreateCapabilityDto,
    actor: RequestUser,
  ): Promise<CapabilityDetailDto> {
    const key = await this.resolveUniqueKey(dto.name, dto.key);

    const capability = await this.repository.create({
      key,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      icon: null,
      status: dto.status ?? CapabilityStatus.DRAFT,
      sortOrder: 0,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.created',
      entityType: 'Capability',
      entityId: capability.id,
      metadata: { key: capability.key, name: capability.name },
    });

    return this.get(capability.id);
  }

  async update(
    id: string,
    dto: UpdateCapabilityDto,
    actor: RequestUser,
  ): Promise<CapabilityDetailDto> {
    await this.requireCapability(id);

    await this.repository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.updated',
      entityType: 'Capability',
      entityId: id,
      metadata: { changes: dto },
    });

    return this.get(id);
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    const capability = await this.requireCapability(id);
    await this.repository.hardDelete(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.deleted',
      entityType: 'Capability',
      entityId: id,
      metadata: { key: capability.key, name: capability.name },
    });
  }

  async activate(id: string, actor: RequestUser): Promise<CapabilityDetailDto> {
    await this.requireCapability(id);
    await this.repository.update(id, {
      status: CapabilityStatus.ACTIVE,
      deletedAt: null,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.activated',
      entityType: 'Capability',
      entityId: id,
    });

    return this.get(id);
  }

  async deactivate(
    id: string,
    actor: RequestUser,
  ): Promise<CapabilityDetailDto> {
    await this.requireCapability(id);
    await this.repository.update(id, { status: CapabilityStatus.INACTIVE });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.deactivated',
      entityType: 'Capability',
      entityId: id,
    });

    return this.get(id);
  }

  async deprecate(
    id: string,
    actor: RequestUser,
  ): Promise<CapabilityDetailDto> {
    await this.requireCapability(id);
    await this.repository.update(id, { status: CapabilityStatus.DEPRECATED });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.deprecated',
      entityType: 'Capability',
      entityId: id,
    });

    return this.get(id);
  }

  async requireCapability(id: string) {
    const capability = await this.repository.findById(id);
    if (!capability) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Capability not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return capability;
  }

  private capabilityKeyFromName(name: string): string {
    let key = underscoreSlugify(name);
    if (!key || !/^[a-z]/.test(key)) {
      key = `cap_${key || 'ability'}`.replace(/^_+|_+$/g, '');
    }
    return key;
  }

  private async resolveUniqueKey(
    name: string,
    providedKey?: string,
  ): Promise<string> {
    const base = providedKey?.trim() || this.capabilityKeyFromName(name);
    if (!base) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Could not derive capability key from name',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.validation.validateKey(base);

    for (let suffix = 1; suffix < 1000; suffix++) {
      const key = withUnderscoreSuffix(base, suffix);
      const existing = await this.repository.findByKey(key);
      if (!existing) {
        return key;
      }
    }

    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Could not generate a unique capability key',
      HttpStatus.CONFLICT,
    );
  }
}
