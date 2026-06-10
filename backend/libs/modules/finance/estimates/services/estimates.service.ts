import { HttpStatus, Injectable } from '@nestjs/common';
import { EstimateStatus, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import {
  addDaysToDate,
  computeDefaultTaxAmount,
} from '@app/modules/platform/business/utils/financial-settings.util';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { WorkItemRepository } from '@app/modules/operations/work-items/repositories/work-item.repository';
import { CreateEstimateDto } from '../dto/create-estimate.dto';
import { EstimateItemInputDto } from '../dto/estimate-item-input.dto';
import { EstimateResponseDto } from '../dto/estimate-response.dto';
import { ListEstimatesQueryDto } from '../dto/list-estimates-query.dto';
import { UpdateEstimateDto } from '../dto/update-estimate.dto';
import { UpdateEstimateStatusDto } from '../dto/update-estimate-status.dto';
import { toEstimateResponse } from '../mappers/estimate.mapper';
import {
  CreateEstimateData,
  EstimateRepository,
} from '../repositories/estimate.repository';
import { calculateEstimateTotals } from '../utils/estimate-calculations.util';

@Injectable()
export class EstimatesService {
  constructor(
    private readonly estimateRepository: EstimateRepository,
    private readonly contactRepository: ContactRepository,
    private readonly workItemRepository: WorkItemRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly auditService: AuditService,
    private readonly financialSettingsService: FinancialSettingsService,
  ) {}

  async create(
    businessId: string,
    dto: CreateEstimateDto,
    actor: RequestUser,
  ): Promise<EstimateResponseDto> {
    await this.assertContact(businessId, dto.contactId);
    if (dto.workItemId) {
      await this.assertWorkItem(businessId, dto.workItemId, dto.contactId);
    }
    await this.validateItemServices(businessId, dto.items);

    const financialSettings =
      await this.financialSettingsService.getSettingsForBusiness(businessId);

    const subtotalPreview = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxAmount =
      dto.taxAmount ??
      computeDefaultTaxAmount(
        subtotalPreview,
        financialSettings.taxesAndCurrency.defaultTaxRate,
        financialSettings.taxesAndCurrency.pricesIncludeTax,
      );
    const discountAmount = dto.discountAmount ?? 0;

    const totals = calculateEstimateTotals({
      items: dto.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      taxAmount,
      discountAmount,
    });

    const estimateNumber =
      await this.financialSettingsService.allocateEstimateNumber(businessId);

    const issueDate = this.parseDate(dto.issueDate) ?? this.startOfToday();
    let expiryDate = this.parseDate(dto.expiryDate);
    if (!expiryDate && !dto.expiryDate) {
      expiryDate = addDaysToDate(
        issueDate,
        financialSettings.estimate.defaultExpiryDays,
      );
    }

    const estimate = await this.estimateRepository.create(
      businessId,
      {
        contactId: dto.contactId,
        workItemId: dto.workItemId ?? null,
        estimateNumber,
        status: dto.status ?? EstimateStatus.DRAFT,
        issueDate,
        expiryDate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        notes:
          dto.notes?.trim() ||
          financialSettings.estimate.defaultNotes.trim() ||
          null,
        termsAndConditions:
          dto.termsAndConditions?.trim() ||
          financialSettings.estimate.defaultTermsAndConditions.trim() ||
          null,
        items: this.mapItems(dto.items, totals.lineTotals),
      },
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'estimate.created',
      entityType: 'Estimate',
      entityId: estimate.id,
    });

    return toEstimateResponse(estimate);
  }

  async list(
    businessId: string,
    query: ListEstimatesQueryDto,
  ): Promise<{
    items: EstimateResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.estimateRepository.findMany(
      businessId,
      {
        skip,
        take,
        search: query.search?.trim() || undefined,
        contactId: query.contactId,
        status: query.status,
        issueFrom: query.issueFrom ? new Date(query.issueFrom) : undefined,
        issueTo: query.issueTo ? new Date(query.issueTo) : undefined,
      },
    );

    return {
      items: items.map(toEstimateResponse),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<EstimateResponseDto> {
    const estimate = await this.estimateRepository.findById(businessId, id);
    if (!estimate) {
      throw new AppException(
        ErrorCode.ESTIMATE_NOT_FOUND,
        'Estimate not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toEstimateResponse(estimate);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateEstimateDto,
    actor: RequestUser,
  ): Promise<EstimateResponseDto> {
    const existing = await this.estimateRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.ESTIMATE_NOT_FOUND,
        'Estimate not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const contactId = dto.contactId ?? existing.contactId;
    if (dto.contactId) {
      await this.assertContact(businessId, dto.contactId);
    }

    const workItemId =
      dto.workItemId !== undefined ? dto.workItemId : existing.workItemId;
    if (workItemId) {
      await this.assertWorkItem(businessId, workItemId, contactId);
    }

    if (dto.items) {
      await this.validateItemServices(businessId, dto.items);
    }

    const data: Prisma.EstimateUpdateInput = {};
    let itemsData: CreateEstimateData['items'] | undefined;

    if (dto.contactId !== undefined) {
      data.contact = { connect: { id: dto.contactId } };
    }
    if (dto.workItemId !== undefined) {
      data.workItem =
        dto.workItemId === null
          ? { disconnect: true }
          : { connect: { id: dto.workItemId } };
    }
    if (dto.issueDate !== undefined) {
      data.issueDate = new Date(dto.issueDate);
    }
    if (dto.expiryDate !== undefined) {
      data.expiryDate =
        dto.expiryDate === null ? null : new Date(dto.expiryDate);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }
    if (dto.termsAndConditions !== undefined) {
      data.termsAndConditions = dto.termsAndConditions?.trim() || null;
    }

    const itemsInput =
      dto.items ??
      existing.items.map((item) => ({
        serviceId: item.serviceId ?? undefined,
        title: item.title,
        description: item.description ?? undefined,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }));

    const taxAmount =
      dto.taxAmount !== undefined ? dto.taxAmount : Number(existing.taxAmount);
    const discountAmount =
      dto.discountAmount !== undefined
        ? dto.discountAmount
        : Number(existing.discountAmount);

    if (
      dto.items ||
      dto.taxAmount !== undefined ||
      dto.discountAmount !== undefined
    ) {
      const totals = calculateEstimateTotals({
        items: itemsInput.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        taxAmount,
        discountAmount,
      });
      data.subtotal = totals.subtotal;
      data.taxAmount = totals.taxAmount;
      data.discountAmount = totals.discountAmount;
      data.totalAmount = totals.totalAmount;
      if (dto.items) {
        itemsData = this.mapItems(dto.items, totals.lineTotals);
      }
    }

    const estimate = await this.estimateRepository.update(
      businessId,
      id,
      data,
      itemsData,
    );
    if (!estimate) {
      throw new AppException(
        ErrorCode.ESTIMATE_NOT_FOUND,
        'Estimate not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'estimate.updated',
      entityType: 'Estimate',
      entityId: id,
    });

    return toEstimateResponse(estimate);
  }

  async updateStatus(
    businessId: string,
    id: string,
    dto: UpdateEstimateStatusDto,
    actor: RequestUser,
  ): Promise<EstimateResponseDto> {
    const existing = await this.estimateRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.ESTIMATE_NOT_FOUND,
        'Estimate not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const estimate = await this.estimateRepository.update(businessId, id, {
      status: dto.status,
    });
    if (!estimate) {
      throw new AppException(
        ErrorCode.ESTIMATE_NOT_FOUND,
        'Estimate not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'estimate.status_changed',
      entityType: 'Estimate',
      entityId: id,
      metadata: { from: existing.status, to: dto.status },
    });

    return toEstimateResponse(estimate);
  }

  async duplicate(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<EstimateResponseDto> {
    const existing = await this.estimateRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.ESTIMATE_NOT_FOUND,
        'Estimate not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const estimateNumber =
      await this.financialSettingsService.allocateEstimateNumber(businessId);

    const estimate = await this.estimateRepository.create(
      businessId,
      {
        contactId: existing.contactId,
        workItemId: existing.workItemId,
        estimateNumber,
        status: EstimateStatus.DRAFT,
        issueDate: this.startOfToday(),
        expiryDate: existing.expiryDate,
        subtotal: existing.subtotal,
        taxAmount: existing.taxAmount,
        discountAmount: existing.discountAmount,
        totalAmount: existing.totalAmount,
        notes: existing.notes,
        termsAndConditions: existing.termsAndConditions,
        items: existing.items.map((item) => ({
          serviceId: item.serviceId,
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      },
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'estimate.duplicated',
      entityType: 'Estimate',
      entityId: estimate.id,
      metadata: { sourceEstimateId: id },
    });

    return toEstimateResponse(estimate);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<EstimateResponseDto> {
    const existing = await this.estimateRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.ESTIMATE_NOT_FOUND,
        'Estimate not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.estimateRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'estimate.deleted',
      entityType: 'Estimate',
      entityId: id,
    });

    return toEstimateResponse(existing);
  }

  private mapItems(
    items: EstimateItemInputDto[],
    lineTotals: Prisma.Decimal[],
  ): CreateEstimateData['items'] {
    return items.map((item, index) => ({
      serviceId: item.serviceId ?? null,
      title: item.title.trim(),
      description: item.description?.trim() || null,
      quantity: new Prisma.Decimal(item.quantity),
      unitPrice: new Prisma.Decimal(item.unitPrice.toFixed(2)),
      totalPrice: lineTotals[index],
    }));
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    return new Date(value);
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async assertContact(
    businessId: string,
    contactId: string,
  ): Promise<void> {
    const contact = await this.contactRepository.findById(
      businessId,
      contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async assertWorkItem(
    businessId: string,
    workItemId: string,
    contactId: string,
  ): Promise<void> {
    const workItem = await this.workItemRepository.findById(
      businessId,
      workItemId,
    );
    if (!workItem) {
      throw new AppException(
        ErrorCode.WORK_ITEM_NOT_FOUND,
        'Work item not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (workItem.contactId !== contactId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Work item does not belong to this contact',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async validateItemServices(
    businessId: string,
    items: EstimateItemInputDto[],
  ): Promise<void> {
    for (const item of items) {
      if (!item.serviceId) {
        continue;
      }
      const service = await this.serviceRepository.findById(
        businessId,
        item.serviceId,
      );
      if (!service) {
        throw new AppException(
          ErrorCode.SERVICE_NOT_FOUND,
          `Service not found: ${item.serviceId}`,
          HttpStatus.NOT_FOUND,
        );
      }
    }
  }
}
