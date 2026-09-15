import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CannedResponseResponseDto,
  CreateCannedResponseDto,
  UpdateCannedResponseDto,
} from '../dto/canned-response.dto';
import { CannedResponsesRepository } from '../repositories/canned-responses.repository';

@Injectable()
export class CannedResponsesService {
  constructor(
    private readonly repository: CannedResponsesRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(businessId: string): Promise<CannedResponseResponseDto[]> {
    const items = await this.repository.findMany(businessId);
    return items.map((item) => this.toResponse(item));
  }

  async create(
    businessId: string,
    dto: CreateCannedResponseDto,
    actor: RequestUser,
  ): Promise<CannedResponseResponseDto> {
    const sortOrder =
      dto.sortOrder ?? (await this.repository.getNextSortOrder(businessId));
    const item = await this.repository.create({
      business: { connect: { id: businessId } },
      title: dto.title.trim(),
      body: dto.body.trim(),
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'canned_response.created',
      entityType: 'CannedResponse',
      entityId: item.id,
    });

    return this.toResponse(item);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateCannedResponseDto,
    actor: RequestUser,
  ): Promise<CannedResponseResponseDto> {
    await this.requireItem(businessId, id);
    const item = await this.repository.update(id, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'canned_response.updated',
      entityType: 'CannedResponse',
      entityId: item.id,
    });

    return this.toResponse(item);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.requireItem(businessId, id);
    await this.repository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'canned_response.deleted',
      entityType: 'CannedResponse',
      entityId: id,
    });
  }

  private async requireItem(businessId: string, id: string) {
    const item = await this.repository.findById(businessId, id);
    if (!item) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Quick reply not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return item;
  }

  private toResponse(item: {
    id: string;
    title: string;
    body: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): CannedResponseResponseDto {
    return {
      id: item.id,
      title: item.title,
      body: item.body,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
