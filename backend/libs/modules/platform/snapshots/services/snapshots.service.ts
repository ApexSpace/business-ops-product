import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SnapshotStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateSnapshotDto,
  SnapshotListItemDto,
  SnapshotResponseDto,
  UpdateSnapshotDto,
} from '../dto/snapshot.dto';
import {
  toSnapshotListItem,
  toSnapshotResponse,
} from '../mappers/snapshot.mapper';
import { EMPTY_SNAPSHOT_ASSETS } from '../types/snapshot-assets.types';
import { SnapshotRepository } from '../repositories/snapshot.repository';
import { SnapshotApplyService } from './snapshot-apply.service';
import { SnapshotValidationService } from './snapshot-validation.service';

@Injectable()
export class SnapshotsService {
  constructor(
    private readonly snapshotRepository: SnapshotRepository,
    private readonly validationService: SnapshotValidationService,
    private readonly applyService: SnapshotApplyService,
    private readonly auditService: AuditService,
  ) {}

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    status?: SnapshotStatus;
  }) {
    const { items, total } = await this.snapshotRepository.findMany({
      skip: params.skip,
      take: params.limit,
      status: params.status,
    });
    return {
      items: items.map(toSnapshotListItem),
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async get(id: string): Promise<SnapshotResponseDto> {
    const snapshot = await this.requireSnapshot(id);
    const count = await this.countBusinesses(id);
    return toSnapshotResponse(snapshot, count);
  }

  async create(
    dto: CreateSnapshotDto,
    actor: RequestUser,
  ): Promise<SnapshotResponseDto> {
    const rawAssets = dto.assets ?? EMPTY_SNAPSHOT_ASSETS;

    const snapshot = await this.snapshotRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim(),
      status: SnapshotStatus.DRAFT,
      assets: rawAssets as unknown as Prisma.InputJsonValue,
      createdBy: { connect: { id: actor.id } },
      updatedBy: { connect: { id: actor.id } },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.snapshot.created',
      entityType: 'Snapshot',
      entityId: snapshot.id,
      metadata: { name: snapshot.name },
    });

    return toSnapshotResponse(snapshot);
  }

  async update(
    id: string,
    dto: UpdateSnapshotDto,
    actor: RequestUser,
  ): Promise<SnapshotResponseDto> {
    const existing = await this.requireSnapshot(id);

    if (dto.status !== undefined) {
      if (dto.status === SnapshotStatus.PUBLISHED) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Use the publish endpoint to publish snapshots',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        dto.status === SnapshotStatus.DRAFT &&
        existing.status !== SnapshotStatus.PUBLISHED
      ) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Only published snapshots can be moved to draft',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (dto.status === SnapshotStatus.ARCHIVED) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Use the archive endpoint to archive snapshots',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    let assets: Prisma.InputJsonValue | undefined;
    if (dto.assets !== undefined) {
      const validated =
        existing.status === SnapshotStatus.PUBLISHED
          ? this.validationService.validateAndSanitize(dto.assets)
          : dto.assets;
      assets = validated as unknown as Prisma.InputJsonValue;
    }

    const updated = await this.snapshotRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() }
        : {}),
      ...(dto.status === SnapshotStatus.DRAFT
        ? { status: SnapshotStatus.DRAFT, publishedAt: null }
        : {}),
      ...(assets !== undefined ? { assets } : {}),
      updatedBy: { connect: { id: actor.id } },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.snapshot.updated',
      entityType: 'Snapshot',
      entityId: id,
      metadata: { changes: dto },
    });

    return toSnapshotResponse(updated);
  }

  async publish(id: string, actor: RequestUser): Promise<SnapshotResponseDto> {
    const snapshot = await this.requireSnapshot(id);

    if (snapshot.status === SnapshotStatus.ARCHIVED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Archived snapshots must be restored before publishing',
        HttpStatus.BAD_REQUEST,
      );
    }

    const assets = this.validationService.validateAndSanitize(snapshot.assets);
    const updated = await this.snapshotRepository.update(id, {
      status: SnapshotStatus.PUBLISHED,
      publishedAt: new Date(),
      assets: assets as unknown as Prisma.InputJsonValue,
      updatedBy: { connect: { id: actor.id } },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.snapshot.published',
      entityType: 'Snapshot',
      entityId: id,
      metadata: { name: snapshot.name },
    });

    return toSnapshotResponse(updated);
  }

  async archive(id: string, actor: RequestUser): Promise<SnapshotResponseDto> {
    const snapshot = await this.requireSnapshot(id);

    if (snapshot.status === SnapshotStatus.DRAFT) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Draft snapshots should be deleted, not archived',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.snapshotRepository.update(id, {
      status: SnapshotStatus.ARCHIVED,
      updatedBy: { connect: { id: actor.id } },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.snapshot.archived',
      entityType: 'Snapshot',
      entityId: id,
      metadata: { name: snapshot.name },
    });

    return toSnapshotResponse(updated);
  }

  async clone(id: string, actor: RequestUser): Promise<SnapshotResponseDto> {
    const snapshot = await this.requireSnapshot(id);

    const cloned = await this.snapshotRepository.create({
      name: `${snapshot.name} (Copy)`,
      description: snapshot.description,
      status: SnapshotStatus.DRAFT,
      assets: snapshot.assets as Prisma.InputJsonValue,
      createdBy: { connect: { id: actor.id } },
      updatedBy: { connect: { id: actor.id } },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.snapshot.cloned',
      entityType: 'Snapshot',
      entityId: cloned.id,
      metadata: { sourceId: id, name: cloned.name },
    });

    return toSnapshotResponse(cloned);
  }

  async apply(
    id: string,
    businessId: string,
    actor: RequestUser,
  ): Promise<{ applied: true; snapshotId: string; businessId: string }> {
    const snapshot = await this.requireSnapshot(id);

    if (snapshot.status !== SnapshotStatus.PUBLISHED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Only published snapshots can be applied',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.applyService.apply(businessId, snapshot.id, actor.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'platform.snapshot.applied',
      entityType: 'Snapshot',
      entityId: id,
      metadata: { businessId, name: snapshot.name },
    });

    return { applied: true, snapshotId: id, businessId };
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    const snapshot = await this.requireSnapshot(id);

    if (snapshot.status === SnapshotStatus.PUBLISHED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Published snapshots cannot be deleted. Archive first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.snapshotRepository.softDelete(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.snapshot.deleted',
      entityType: 'Snapshot',
      entityId: id,
      metadata: { name: snapshot.name },
    });
  }

  async resolveForBusiness(snapshotId?: string | null) {
    if (snapshotId) {
      const byId = await this.snapshotRepository.findPublishedById(snapshotId);
      if (byId) return byId;
    }

    return this.snapshotRepository.findDefaultPublished();
  }

  private async requireSnapshot(id: string) {
    const snapshot = await this.snapshotRepository.findById(id);
    if (!snapshot) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Snapshot not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return snapshot;
  }

  private countBusinesses(id: string): Promise<number> {
    return this.snapshotRepository.countBusinesses(id);
  }
}
