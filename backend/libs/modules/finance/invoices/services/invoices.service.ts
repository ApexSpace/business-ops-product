import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, Prisma } from '@prisma/client';
import type { RootConfig } from '@app/core/config/configuration';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import {
  addDaysToDate,
  computeDefaultTaxAmount,
  parsePaymentTermsDays,
} from '@app/modules/platform/business/utils/financial-settings.util';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { EstimateRepository } from '@app/modules/finance/estimates/repositories/estimate.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { WorkItemRepository } from '@app/modules/operations/work-items/repositories/work-item.repository';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceItemInputDto } from '../dto/invoice-item-input.dto';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { ListInvoicesQueryDto } from '../dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { UpdateInvoiceStatusDto } from '../dto/update-invoice-status.dto';
import { toInvoiceResponse } from '../mappers/invoice.mapper';
import {
  CreateInvoiceData,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import {
  balanceDueForStatus,
  calculateInvoiceTotals,
  recalculateBalanceDue,
} from '../utils/invoice-calculations.util';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import {
  formatContactName,
  formatMoney,
} from '@app/modules/communications/email/utils/email-variables.util';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import {
  buildInvoicePublicUrl,
  generateInvoicePublicToken,
} from '../utils/invoice-public-token.util';
import { DateTime } from 'luxon';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly contactRepository: ContactRepository,
    private readonly estimateRepository: EstimateRepository,
    private readonly workItemRepository: WorkItemRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly auditService: AuditService,
    private readonly financialSettingsService: FinancialSettingsService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly businessRepository: BusinessRepository,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  async create(
    businessId: string,
    dto: CreateInvoiceDto,
    actor: RequestUser,
  ): Promise<InvoiceResponseDto> {
    await this.assertContact(businessId, dto.contactId);
    if (dto.estimateId) {
      await this.assertEstimate(businessId, dto.estimateId, dto.contactId);
    }
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

    const totals = calculateInvoiceTotals({
      items: dto.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      taxAmount,
      discountAmount,
    });

    const status = dto.status ?? InvoiceStatus.DRAFT;
    const balanceDue = balanceDueForStatus(status, totals.totalAmount);

    const invoiceNumber =
      await this.financialSettingsService.allocateInvoiceNumber(businessId);

    const issueDate = this.parseDate(dto.issueDate) ?? this.startOfToday();
    let dueDate = this.parseDate(dto.dueDate);
    if (!dueDate && !dto.dueDate) {
      const termsDays = parsePaymentTermsDays(
        dto.paymentTerms ?? financialSettings.invoice.defaultPaymentTerms,
      );
      if (termsDays) {
        dueDate = addDaysToDate(issueDate, termsDays);
      }
    }

    const invoice = await this.invoiceRepository.create(
      businessId,
      {
        contactId: dto.contactId,
        estimateId: dto.estimateId ?? null,
        workItemId: dto.workItemId ?? null,
        invoiceNumber,
        status,
        issueDate,
        dueDate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        balanceDue,
        notes:
          dto.notes?.trim() ||
          financialSettings.invoice.defaultNotes.trim() ||
          null,
        paymentTerms:
          dto.paymentTerms?.trim() ||
          financialSettings.invoice.defaultPaymentTerms.trim() ||
          null,
        termsAndConditions:
          dto.termsAndConditions?.trim() ||
          financialSettings.invoice.defaultTermsAndConditions.trim() ||
          null,
        items: this.mapItems(dto.items, totals.lineTotals),
      },
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'invoice.created',
      entityType: 'Invoice',
      entityId: invoice.id,
    });

    if (status === InvoiceStatus.SENT) {
      const withRelations = await this.invoiceRepository.findById(
        businessId,
        invoice.id,
      );
      if (withRelations) {
        void this.sendInvoiceSentEmail(businessId, withRelations).catch(
          () => undefined,
        );
      }
    }

    return toInvoiceResponse(invoice);
  }

  async list(
    businessId: string,
    query: ListInvoicesQueryDto,
  ): Promise<{
    items: InvoiceResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.invoiceRepository.findMany(
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
      items: items.map(toInvoiceResponse),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findById(businessId, id);
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toInvoiceResponse(invoice);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateInvoiceDto,
    actor: RequestUser,
  ): Promise<InvoiceResponseDto> {
    const existing = await this.invoiceRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const contactId = dto.contactId ?? existing.contactId;
    if (dto.contactId) {
      await this.assertContact(businessId, dto.contactId);
    }

    const estimateId =
      dto.estimateId !== undefined ? dto.estimateId : existing.estimateId;
    if (estimateId) {
      await this.assertEstimate(businessId, estimateId, contactId);
    }

    const workItemId =
      dto.workItemId !== undefined ? dto.workItemId : existing.workItemId;
    if (workItemId) {
      await this.assertWorkItem(businessId, workItemId, contactId);
    }

    if (dto.items) {
      await this.validateItemServices(businessId, dto.items);
    }

    const data: Prisma.InvoiceUpdateInput = {};
    let itemsData: CreateInvoiceData['items'] | undefined;

    if (dto.contactId !== undefined) {
      data.contact = { connect: { id: dto.contactId } };
    }
    if (dto.estimateId !== undefined) {
      data.estimate =
        dto.estimateId === null
          ? { disconnect: true }
          : { connect: { id: dto.estimateId } };
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
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate === null ? null : new Date(dto.dueDate);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }
    if (dto.paymentTerms !== undefined) {
      data.paymentTerms = dto.paymentTerms?.trim() || null;
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
      dto.taxAmount !== undefined
        ? dto.taxAmount
        : Number(existing.taxAmount);
    const discountAmount =
      dto.discountAmount !== undefined
        ? dto.discountAmount
        : Number(existing.discountAmount);

    const financialsChanged =
      dto.items !== undefined ||
      dto.taxAmount !== undefined ||
      dto.discountAmount !== undefined;

    if (financialsChanged) {
      const totals = calculateInvoiceTotals({
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

      const nextStatus = (dto.status ?? existing.status) as InvoiceStatus;
      if (nextStatus === InvoiceStatus.PAID || nextStatus === InvoiceStatus.VOID) {
        data.balanceDue = balanceDueForStatus(nextStatus, totals.totalAmount);
      } else {
        data.balanceDue = recalculateBalanceDue(
          existing.totalAmount,
          existing.balanceDue,
          totals.totalAmount,
        );
      }

      if (dto.items) {
        itemsData = this.mapItems(dto.items, totals.lineTotals);
      }
    } else if (dto.status !== undefined) {
      data.balanceDue = balanceDueForStatus(
        dto.status,
        existing.totalAmount,
      );
    }

    const invoice = await this.invoiceRepository.update(
      businessId,
      id,
      data,
      itemsData,
    );
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'invoice.updated',
      entityType: 'Invoice',
      entityId: id,
    });

    return toInvoiceResponse(invoice);
  }

  async updateStatus(
    businessId: string,
    id: string,
    dto: UpdateInvoiceStatusDto,
    actor: RequestUser,
  ): Promise<InvoiceResponseDto> {
    const existing = await this.invoiceRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const balanceDue = balanceDueForStatus(dto.status, existing.totalAmount);

    const invoice = await this.invoiceRepository.update(businessId, id, {
      status: dto.status,
      balanceDue,
    });
    if (!invoice) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'invoice.status_changed',
      entityType: 'Invoice',
      entityId: id,
      metadata: { from: existing.status, to: dto.status },
    });

    if (dto.status === InvoiceStatus.SENT && existing.status !== InvoiceStatus.SENT) {
      void this.sendInvoiceSentEmail(businessId, invoice).catch(() => undefined);
    }

    return toInvoiceResponse(invoice);
  }

  private async sendInvoiceSentEmail(
    businessId: string,
    invoice: NonNullable<Awaited<ReturnType<InvoiceRepository['findById']>>>,
  ): Promise<void> {
    const contactEmail = invoice.contact?.email?.trim();
    if (!contactEmail) {
      return;
    }

    const publicUrl = await this.ensureInvoicePublicUrl(businessId, invoice);
    const business = await this.businessRepository.findById(businessId);
    const financialSettings =
      await this.financialSettingsService.getSettingsForBusiness(businessId);
    const currency = financialSettings.taxesAndCurrency.currencyCode;

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId,
      emailType: 'invoice.sent',
      toEmail: contactEmail,
      contactId: invoice.contactId,
      entityType: 'Invoice',
      entityId: invoice.id,
      idempotencyKey: `invoice-sent-${invoice.id}`,
      variables: {
        'business.name': business?.name ?? 'Business',
        'contact.name': formatContactName(invoice.contact),
        'invoice.number': invoice.invoiceNumber,
        'invoice.total': formatMoney(invoice.totalAmount, currency),
        'invoice.due_date': invoice.dueDate
          ? DateTime.fromJSDate(invoice.dueDate).toFormat('LLL d, yyyy')
          : '—',
        'invoice.public_url': publicUrl,
      },
    });
  }

  private async ensureInvoicePublicUrl(
    businessId: string,
    invoice: NonNullable<Awaited<ReturnType<InvoiceRepository['findById']>>>,
  ): Promise<string> {
    const frontendUrl = this.configService.get('app.frontendUrl', { infer: true });
    const publicToken =
      invoice.publicToken ?? generateInvoicePublicToken();
    const publicUrl = buildInvoicePublicUrl(frontendUrl, publicToken);

    if (!invoice.publicToken || invoice.publicUrl !== publicUrl) {
      await this.invoiceRepository.update(businessId, invoice.id, {
        publicToken,
        publicUrl,
      });
    }

    return publicUrl;
  }

  async duplicate(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<InvoiceResponseDto> {
    const existing = await this.invoiceRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const invoiceNumber =
      await this.financialSettingsService.allocateInvoiceNumber(businessId);

    const invoice = await this.invoiceRepository.create(
      businessId,
      {
        contactId: existing.contactId,
        estimateId: existing.estimateId,
        workItemId: existing.workItemId,
        invoiceNumber,
        status: InvoiceStatus.DRAFT,
        issueDate: this.startOfToday(),
        dueDate: existing.dueDate,
        subtotal: existing.subtotal,
        taxAmount: existing.taxAmount,
        discountAmount: existing.discountAmount,
        totalAmount: existing.totalAmount,
        balanceDue: existing.totalAmount,
        notes: existing.notes,
        paymentTerms: existing.paymentTerms,
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
      action: 'invoice.duplicated',
      entityType: 'Invoice',
      entityId: invoice.id,
      metadata: { sourceInvoiceId: id },
    });

    return toInvoiceResponse(invoice);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<InvoiceResponseDto> {
    const existing = await this.invoiceRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.invoiceRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'invoice.deleted',
      entityType: 'Invoice',
      entityId: id,
    });

    return toInvoiceResponse(existing);
  }

  private mapItems(
    items: InvoiceItemInputDto[],
    lineTotals: Prisma.Decimal[],
  ): CreateInvoiceData['items'] {
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

  private async assertEstimate(
    businessId: string,
    estimateId: string,
    contactId: string,
  ): Promise<void> {
    const estimate = await this.estimateRepository.findById(
      businessId,
      estimateId,
    );
    if (!estimate) {
      throw new AppException(
        ErrorCode.ESTIMATE_NOT_FOUND,
        'Estimate not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (estimate.contactId !== contactId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Estimate does not belong to this contact',
        HttpStatus.BAD_REQUEST,
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
    items: InvoiceItemInputDto[],
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
