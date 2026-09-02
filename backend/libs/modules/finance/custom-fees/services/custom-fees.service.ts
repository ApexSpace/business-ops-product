import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CustomFeeApplicationScope,
  InvoiceLineType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import {
  CreateCustomFeeDto,
  ListCustomFeesQueryDto,
  UpdateCustomFeeDto,
} from '../dto/custom-fee.dto';
import { CustomFeeResponseDto } from '../dto/custom-fee-response.dto';
import { toCustomFeeResponse } from '../mappers/custom-fee.mapper';
import { CustomFeeRepository } from '../repositories/custom-fee.repository';
import { assertValidCustomFeeInput } from '../utils/custom-fee-calculations.util';

@Injectable()
export class CustomFeesService {
  constructor(
    private readonly repository: CustomFeeRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    query: ListCustomFeesQueryDto,
  ): Promise<{
    items: CustomFeeResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { skip, take, page, limit } = getPaginationParams(query);
    const { items, total } = await this.repository.findMany(businessId, {
      skip,
      take,
      search: query.search,
    });
    return {
      items: items.map(toCustomFeeResponse),
      meta: { total, page, limit },
    };
  }

  async get(businessId: string, id: string): Promise<CustomFeeResponseDto> {
    const row = await this.assertFee(businessId, id);
    return toCustomFeeResponse(row);
  }

  async create(
    businessId: string,
    dto: CreateCustomFeeDto,
    actor: RequestUser,
  ): Promise<CustomFeeResponseDto> {
    this.validateDto(dto);
    const sortOrder = await this.repository.nextSortOrder(businessId);
    const row = await this.repository.create(businessId, {
      name: dto.name.trim(),
      applicationScope: dto.applicationScope,
      paymentMethods:
        dto.applicationScope === CustomFeeApplicationScope.PAYMENT_METHOD
          ? dto.paymentMethods ?? []
          : [],
      amountType: dto.amountType,
      amount: new Prisma.Decimal(dto.amount),
      isEnabled: dto.isEnabled ?? true,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'custom_fee.created',
      entityType: 'CustomFee',
      entityId: row.id,
    });

    return toCustomFeeResponse(row);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateCustomFeeDto,
    actor: RequestUser,
  ): Promise<CustomFeeResponseDto> {
    const existing = await this.assertFee(businessId, id);
    const nextScope = dto.applicationScope ?? existing.applicationScope;
    const nextAmountType = dto.amountType ?? existing.amountType;
    const nextAmount = dto.amount ?? Number(existing.amount.toString());
    const nextPaymentMethods =
      dto.paymentMethods ??
      (nextScope === CustomFeeApplicationScope.PAYMENT_METHOD
        ? existing.paymentMethods
        : []);

    this.validateDto({
      name: dto.name ?? existing.name,
      applicationScope: nextScope,
      paymentMethods: nextPaymentMethods,
      amountType: nextAmountType,
      amount: nextAmount,
    });

    const row = await this.repository.update(businessId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.applicationScope !== undefined
        ? { applicationScope: dto.applicationScope }
        : {}),
      ...(dto.paymentMethods !== undefined ||
      dto.applicationScope !== undefined
        ? {
            paymentMethods:
              nextScope === CustomFeeApplicationScope.PAYMENT_METHOD
                ? nextPaymentMethods
                : [],
          }
        : {}),
      ...(dto.amountType !== undefined ? { amountType: dto.amountType } : {}),
      ...(dto.amount !== undefined
        ? { amount: new Prisma.Decimal(dto.amount) }
        : {}),
      ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'custom_fee.updated',
      entityType: 'CustomFee',
      entityId: row.id,
    });

    return toCustomFeeResponse(row);
  }

  async delete(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertFee(businessId, id);
    await this.repository.softDelete(businessId, id);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'custom_fee.deleted',
      entityType: 'CustomFee',
      entityId: id,
    });
  }

  private validateDto(
    dto: Pick<
      CreateCustomFeeDto,
      | 'name'
      | 'applicationScope'
      | 'paymentMethods'
      | 'amountType'
      | 'amount'
    >,
  ) {
    try {
      assertValidCustomFeeInput({
        applicationScope: dto.applicationScope,
        paymentMethods: dto.paymentMethods,
        amountType: dto.amountType,
        amount: dto.amount,
      });
    } catch (error) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        error instanceof Error ? error.message : 'Invalid custom fee',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertFee(businessId: string, id: string) {
    const row = await this.repository.findById(businessId, id);
    if (!row) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Custom fee not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }
}
