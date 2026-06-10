import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreatePlanFeatureRowDto,
  PlanFeatureRowDto,
  ReorderPlanFeatureRowsDto,
  UpdatePlanFeatureRowDto,
} from '../dto';
import { toPlanFeatureRow } from '../mappers/plan-group.mapper';
import { PlanGroupsRepository } from '../repositories/plan-groups.repository';

@Injectable()
export class PlanFeatureRowsService {
  constructor(
    private readonly repository: PlanGroupsRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(planGroupId: string): Promise<PlanFeatureRowDto[]> {
    await this.requireGroup(planGroupId);
    const rows = await this.repository.findFeatureRows(planGroupId);
    return rows.map(toPlanFeatureRow);
  }

  async create(
    planGroupId: string,
    dto: CreatePlanFeatureRowDto,
    actor: RequestUser,
  ): Promise<PlanFeatureRowDto> {
    await this.requireGroup(planGroupId);
    const sortOrder =
      dto.sortOrder ??
      (await this.repository.getNextFeatureRowSortOrder(planGroupId));

    const row = await this.repository.createFeatureRow({
      planGroup: { connect: { id: planGroupId } },
      label: dto.label.trim(),
      tooltip: dto.tooltip?.trim(),
      values: (dto.values ?? {}) as unknown as Prisma.InputJsonValue,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_feature_row.created',
      entityType: 'PlanFeatureRow',
      entityId: row.id,
      metadata: { planGroupId, label: row.label },
    });

    return toPlanFeatureRow(row);
  }

  async update(
    planGroupId: string,
    rowId: string,
    dto: UpdatePlanFeatureRowDto,
    actor: RequestUser,
  ): Promise<PlanFeatureRowDto> {
    await this.requireRow(planGroupId, rowId);

    const row = await this.repository.updateFeatureRow(rowId, {
      ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
      ...(dto.tooltip !== undefined ? { tooltip: dto.tooltip?.trim() } : {}),
      ...(dto.values !== undefined
        ? { values: dto.values as unknown as Prisma.InputJsonValue }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_feature_row.updated',
      entityType: 'PlanFeatureRow',
      entityId: rowId,
      metadata: { planGroupId, changes: dto },
    });

    return toPlanFeatureRow(row);
  }

  async remove(
    planGroupId: string,
    rowId: string,
    actor: RequestUser,
  ): Promise<void> {
    const row = await this.requireRow(planGroupId, rowId);
    await this.repository.deleteFeatureRow(rowId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_feature_row.deleted',
      entityType: 'PlanFeatureRow',
      entityId: rowId,
      metadata: { planGroupId, label: row.label },
    });
  }

  async reorder(
    planGroupId: string,
    dto: ReorderPlanFeatureRowsDto,
    actor: RequestUser,
  ): Promise<PlanFeatureRowDto[]> {
    await this.requireGroup(planGroupId);
    await this.repository.reorderFeatureRows(planGroupId, dto.rowIds);
    const rows = await this.repository.findFeatureRows(planGroupId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_feature_row.reordered',
      entityType: 'PlanGroup',
      entityId: planGroupId,
      metadata: { rowIds: dto.rowIds },
    });

    return rows.map(toPlanFeatureRow);
  }

  private async requireGroup(planGroupId: string) {
    const group = await this.repository.findById(planGroupId);
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan group not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return group;
  }

  private async requireRow(planGroupId: string, rowId: string) {
    const row = await this.repository.findFeatureRow(planGroupId, rowId);
    if (!row) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Feature row not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }
}
