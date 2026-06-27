import { HttpStatus, Injectable } from '@nestjs/common';
import { InvoiceLineType, InvoiceStatus, MembershipStatus, PayableType, Prisma, ProductType, ServiceStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import { computeDefaultTaxAmount } from '@app/modules/platform/business/utils/financial-settings.util';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { ServiceWorkspaceRepository } from '@app/modules/crm/services/repositories/service-workspace.repository';
import { PaymentOrchestratorService } from '@app/modules/finance/payments/orchestration/payment-orchestrator.service';
import { ProductPickerService } from '@app/modules/finance/products/services/product-picker.service';
import { ProductRepository } from '@app/modules/finance/products/repositories/product.repository';
import { PackageTemplateRepository } from '@app/modules/finance/packages/repositories/package-template.repository';
import { ProductVariantRepository } from '@app/modules/finance/products/repositories/product-variant.repository';
import { resolveProductPrice } from '@app/modules/finance/products/utils/product-price-resolver.util';
import {
  AddCheckoutProductDto,
  AddCheckoutServiceDto,
  AddGiftCardLineDto,
  AddPackageLineDto,
  AddWalletDepositDto,
  CheckoutItemInputDto,
  CreateCheckoutDto,
  UpdateCheckoutDto,
  UpdateCheckoutLineItemDto,
} from '../dto/checkout.dto';
import { ListCheckoutsQueryDto } from '../dto/checkout-query.dto';
import { CloseCheckoutDto } from '../dto/checkout-query.dto';
import { CheckoutResponseDto } from '../dto/checkout-response.dto';
import { toCheckoutResponse } from '../mappers/checkout.mapper';
import {
  CheckoutItemInput,
  CheckoutRepository,
  CheckoutWithRelations,
} from '../repositories/checkout.repository';
import { calculateInvoiceTotals } from '../utils/invoice-calculations.util';
import { CheckoutCompletionService } from './checkout-completion.service';

@Injectable()
export class CheckoutsService {
  constructor(
    private readonly checkoutRepository: CheckoutRepository,
    private readonly contactRepository: ContactRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly serviceWorkspaceRepository: ServiceWorkspaceRepository,
    private readonly productRepository: ProductRepository,
    private readonly productVariantRepository: ProductVariantRepository,
    private readonly productPickerService: ProductPickerService,
    private readonly packageTemplateRepository: PackageTemplateRepository,
    private readonly prisma: PrismaService,
    private readonly financialSettingsService: FinancialSettingsService,
    private readonly paymentOrchestrator: PaymentOrchestratorService,
    private readonly checkoutCompletion: CheckoutCompletionService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    query: ListCheckoutsQueryDto,
  ): Promise<{
    items: CheckoutResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.checkoutRepository.findMany(
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
      items: items.map(toCheckoutResponse),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<CheckoutResponseDto> {
    const checkout = await this.requireOpenOrClosedCheckout(businessId, id);
    return toCheckoutResponse(checkout);
  }

  async create(
    businessId: string,
    dto: CreateCheckoutDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    await this.assertContact(businessId, dto.contactId);
    const items = dto.items?.length
      ? await this.mapItemInputs(businessId, dto.items)
      : [];
    const totals = await this.computeTotals(businessId, items, 0, 0);
    const { invoiceNumber, displaySequence } =
      await this.financialSettingsService.allocateCheckoutNumber(businessId);

    const checkout = await this.checkoutRepository.create(
      businessId,
      {
        contactId: dto.contactId,
        invoiceNumber,
        displaySequence,
        issueDate: new Date(),
        notes: dto.notes?.trim() || null,
        ...totals,
        items,
      },
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'checkout.created',
      entityType: 'Invoice',
      entityId: checkout.id,
    });

    return toCheckoutResponse(checkout);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateCheckoutDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    const existing = await this.requireEditableCheckout(businessId, id);
    if (dto.contactId) {
      await this.assertContact(businessId, dto.contactId);
    }

    const mappedItems = dto.items
      ? await this.mapItemInputs(businessId, dto.items)
      : existing.items.map((item, index) => ({
          ...this.mapExistingCheckoutItem(item),
          sortOrder: index,
        }));

    if (dto.items) {
      await this.checkoutRepository.replaceItems(id, mappedItems);
    }

    const taxAmount =
      dto.taxAmount !== undefined
        ? dto.taxAmount
        : Number(existing.taxAmount.toString());
    const discountAmount =
      dto.discountAmount !== undefined
        ? dto.discountAmount
        : Number(existing.discountAmount.toString());

    const totals = await this.computeTotals(
      businessId,
      mappedItems,
      taxAmount,
      discountAmount,
    );

    const updated = await this.checkoutRepository.update(businessId, id, {
      contact: dto.contactId
        ? { connect: { id: dto.contactId } }
        : undefined,
      notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
      balanceDue: totals.balanceDue,
      remainingAmount: totals.balanceDue,
    });

    if (!updated) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Checkout not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return toCheckoutResponse(updated);
  }

  async addService(
    businessId: string,
    checkoutId: string,
    dto: AddCheckoutServiceDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    const checkout = await this.requireEditableCheckout(businessId, checkoutId);
    const service = await this.serviceRepository.findById(
      businessId,
      dto.serviceId,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const quantity = dto.quantity ?? 1;
    const unitPrice = Number(service.price?.toString() ?? '0');
    const newItem: CheckoutItemInput = {
      lineType: InvoiceLineType.SERVICE,
      serviceId: service.id,
      staffUserId: dto.staffUserId ?? null,
      title: service.name,
      description: service.description,
      quantity: new Prisma.Decimal(quantity),
      unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
      totalPrice: new Prisma.Decimal((quantity * unitPrice).toFixed(2)),
      sortOrder: checkout.items.length,
    };

    const items = [
      ...checkout.items.map((item) => this.mapExistingCheckoutItem(item)),
      newItem,
    ];

    await this.checkoutRepository.replaceItems(checkoutId, items);
    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  async addProduct(
    businessId: string,
    checkoutId: string,
    dto: AddCheckoutProductDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    const checkout = await this.requireEditableCheckout(businessId, checkoutId);
    const product = await this.productRepository.findById(
      businessId,
      dto.productId,
    );
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (product.productType === ProductType.BUNDLE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Bundle products cannot be added directly in v1',
        HttpStatus.BAD_REQUEST,
      );
    }

    let variant = null;
    if (product.productType === ProductType.VARIABLE) {
      if (!dto.variantId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'variantId is required for variable products',
          HttpStatus.BAD_REQUEST,
        );
      }
      variant = await this.productVariantRepository.findById(
        businessId,
        dto.variantId,
      );
      if (!variant || variant.productId !== product.id) {
        throw new AppException(
          ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
          'Product variant not found',
          HttpStatus.NOT_FOUND,
        );
      }
    } else if (dto.variantId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'variantId is only valid for variable products',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (product.assignStaffToSale && !dto.staffUserId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'staffUserId is required for this product',
        HttpStatus.BAD_REQUEST,
      );
    }

    const quantity = dto.quantity ?? 1;
    const unitPrice = Number(resolveProductPrice(product, variant));
    const variantLabel = variant
      ? variant.optionValues
          .sort(
            (a, b) =>
              a.optionValue.option.sortOrder - b.optionValue.option.sortOrder,
          )
          .map((ov) => ov.optionValue.value)
          .join(' / ')
      : null;
    const title =
      variantLabel != null && variantLabel.length > 0
        ? `${product.name} — ${variantLabel}`
        : product.name;

    const newItem: CheckoutItemInput = {
      lineType: InvoiceLineType.PRODUCT,
      productId: product.id,
      variantId: variant?.id ?? null,
      staffUserId: dto.staffUserId ?? null,
      title,
      description: product.description,
      quantity: new Prisma.Decimal(quantity),
      unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
      totalPrice: new Prisma.Decimal((quantity * unitPrice).toFixed(2)),
      sortOrder: checkout.items.length,
    };

    const items = [
      ...checkout.items.map((item) => this.mapExistingCheckoutItem(item)),
      newItem,
    ];

    await this.checkoutRepository.replaceItems(checkoutId, items);
    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  async listProductsForPicker(businessId: string, search?: string) {
    const items = await this.productPickerService.listSellable(
      businessId,
      search,
    );
    return { items };
  }

  async addWalletDeposit(
    businessId: string,
    checkoutId: string,
    dto: AddWalletDepositDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    await this.requireEditableCheckout(businessId, checkoutId);
    const checkout = await this.checkoutRepository.findById(
      businessId,
      checkoutId,
    );
    if (!checkout) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Checkout not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const amount = new Prisma.Decimal(dto.amount.toFixed(2));
    const newItem: CheckoutItemInput = {
      lineType: InvoiceLineType.ACCOUNT_BALANCE_DEPOSIT,
      title: dto.title?.trim() || 'Account balance deposit',
      quantity: new Prisma.Decimal(1),
      unitPrice: amount,
      totalPrice: amount,
      sortOrder: checkout.items.length,
    };

    const items = [
      ...checkout.items.map((item) => this.mapExistingCheckoutItem(item)),
      newItem,
    ];

    await this.checkoutRepository.replaceItems(checkoutId, items);
    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  async addGiftCardLine(
    businessId: string,
    checkoutId: string,
    dto: AddGiftCardLineDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    await this.requireEditableCheckout(businessId, checkoutId);
    const checkout = await this.checkoutRepository.findById(
      businessId,
      checkoutId,
    );
    if (!checkout) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Checkout not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const owner = await this.contactRepository.findById(
      businessId,
      dto.ownerContactId,
    );
    if (!owner) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Owner contact not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const amount = new Prisma.Decimal(dto.amount.toFixed(2));
    const numberLabel = dto.number?.trim() || 'Auto';
    const newItem: CheckoutItemInput = {
      lineType: InvoiceLineType.GIFT_CARD,
      title: `Gift Card #${numberLabel}`,
      quantity: new Prisma.Decimal(1),
      unitPrice: amount,
      totalPrice: amount,
      sortOrder: checkout.items.length,
      metadata: {
        giftCardNumber: dto.number?.trim() || null,
        cardValue: dto.amount,
        ownerContactId: dto.ownerContactId,
        sendDigital: dto.sendDigital ?? false,
      },
    };

    const items = [
      ...checkout.items.map((item) => this.mapExistingCheckoutItem(item)),
      newItem,
    ];

    await this.checkoutRepository.replaceItems(checkoutId, items);
    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  async addPackageLine(
    businessId: string,
    checkoutId: string,
    dto: AddPackageLineDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    await this.requireEditableCheckout(businessId, checkoutId);
    const checkout = await this.checkoutRepository.findById(
      businessId,
      checkoutId,
    );
    if (!checkout) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Checkout not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const owner = await this.contactRepository.findById(
      businessId,
      dto.ownerContactId,
    );
    if (!owner) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Owner contact not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const template = await this.packageTemplateRepository.findById(
      businessId,
      dto.packageTemplateId,
    );
    if (!template) {
      throw new AppException(
        ErrorCode.PACKAGE_TEMPLATE_NOT_FOUND,
        'Package template not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const amount = template.totalPrice;
    const emoji = template.emoji ? `${template.emoji} ` : '';
    const newItem: CheckoutItemInput = {
      lineType: InvoiceLineType.PACKAGE,
      title: `${emoji}${template.name}`.trim(),
      quantity: new Prisma.Decimal(1),
      unitPrice: amount,
      totalPrice: amount,
      sortOrder: checkout.items.length,
      metadata: {
        packageTemplateId: dto.packageTemplateId,
        ownerContactId: dto.ownerContactId,
        isDemo: dto.isDemo ?? false,
      },
    };

    const items = [
      ...checkout.items.map((item) => this.mapExistingCheckoutItem(item)),
      newItem,
    ];

    await this.checkoutRepository.replaceItems(checkoutId, items);
    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  async voidCheckout(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    const checkout = await this.requireEditableCheckout(businessId, id);
    const updated = await this.checkoutRepository.update(businessId, id, {
      status: InvoiceStatus.VOID,
      balanceDue: new Prisma.Decimal(0),
      remainingAmount: new Prisma.Decimal(0),
    });
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'checkout.voided',
      entityType: 'Invoice',
      entityId: checkout.id,
    });
    return toCheckoutResponse(updated!);
  }

  async close(
    businessId: string,
    id: string,
    dto: CloseCheckoutDto,
    actor: RequestUser,
  ) {
    const checkout = await this.requireEditableCheckout(businessId, id);
    if (checkout.items.length === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Add at least one line item before closing the sale',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (checkout.totalAmount.lessThanOrEqualTo(0)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Sale total must be greater than zero',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.paymentOrchestrator.collectPayment({
      businessId,
      payableType: PayableType.INVOICE,
      payableId: checkout.id,
      tenders: dto.tenders.map((t) => ({
        method: t.method,
        amount: t.amount,
        reference: t.reference,
        notes: t.notes,
        contactPaymentMethodId: t.contactPaymentMethodId,
        giftCardId: t.giftCardId,
      })),
      channel: 'STAFF_POS',
      stripeMode: 'EMBEDDED',
      actorUserId: actor.id,
    });

    if (result.completed) {
      await this.checkoutCompletion.finalizeCheckoutIfPaid(
        businessId,
        checkout.id,
        actor.id,
      );
      await this.auditService.log({
        actorUserId: actor.id,
        businessId,
        action: 'checkout.closed',
        entityType: 'Invoice',
        entityId: checkout.id,
      });
    }

    const refreshed = await this.checkoutRepository.findById(businessId, id);
    return {
      checkout: toCheckoutResponse(refreshed!),
      completed: result.completed,
      paymentIds: result.paymentIds,
      stripeTenders: result.stripeTenders,
    };
  }

  async listServicesForPicker(businessId: string) {
    const { items } = await this.serviceRepository.findMany(businessId, {
      skip: 0,
      take: 100,
      status: ServiceStatus.ACTIVE,
    });
    return {
      items: items.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price?.toString() ?? '0',
        durationMinutes: s.durationMinutes,
      })),
    };
  }

  async listStaffForServicePicker(businessId: string, serviceId: string) {
    const service = await this.serviceWorkspaceRepository.findWorkspace(
      businessId,
      serviceId,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const enabledStaff = service.staffAssignments
      .filter((row) => row.isEnabled)
      .map((row) => {
        const name = [row.user.firstName, row.user.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        return {
          id: row.userId,
          label: name || row.user.email || 'Staff',
        };
      });

    if (enabledStaff.length > 0) {
      return { items: enabledStaff };
    }

    const members = await this.prisma.businessMembership.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      take: 100,
    });

    return {
      items: members.map((member) => {
        const name = [member.user.firstName, member.user.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        return {
          id: member.user.id,
          label: name || member.user.email || 'Staff',
        };
      }),
    };
  }

  async updateLineItem(
    businessId: string,
    checkoutId: string,
    lineId: string,
    dto: UpdateCheckoutLineItemDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    const checkout = await this.requireEditableCheckout(businessId, checkoutId);
    const line = checkout.items.find((item) => item.id === lineId);
    if (!line) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Line item not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const quantity =
      dto.quantity !== undefined
        ? dto.quantity
        : Number(line.quantity.toString());
    const unitPrice =
      dto.unitPrice !== undefined
        ? dto.unitPrice
        : Number(line.unitPrice.toString());
    const title = dto.title?.trim() || line.title;
    const staffUserId =
      dto.staffUserId !== undefined ? dto.staffUserId : line.staffUserId;

    const items = checkout.items.map((item) => {
      if (item.id !== lineId) {
        return this.mapExistingCheckoutItem(item);
      }
      return {
        ...this.mapExistingCheckoutItem(item),
        staffUserId,
        title,
        quantity: new Prisma.Decimal(quantity),
        unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
        totalPrice: new Prisma.Decimal((quantity * unitPrice).toFixed(2)),
      };
    });

    await this.checkoutRepository.replaceItems(checkoutId, items);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'checkout.line_updated',
      entityType: 'Invoice',
      entityId: checkoutId,
      metadata: { lineId },
    });

    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  async removeLineItem(
    businessId: string,
    checkoutId: string,
    lineId: string,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    await this.requireEditableCheckout(businessId, checkoutId);
    const removed = await this.checkoutRepository.deleteItem(checkoutId, lineId);
    if (!removed) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Line item not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'checkout.line_removed',
      entityType: 'Invoice',
      entityId: checkoutId,
      metadata: { lineId },
    });

    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  private async recalculateAndReturn(
    businessId: string,
    checkoutId: string,
    _actorUserId: string,
  ): Promise<CheckoutResponseDto> {
    const checkout = await this.checkoutRepository.findById(
      businessId,
      checkoutId,
    );
    if (!checkout) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Checkout not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const mappedItems = checkout.items.map((item) =>
      this.mapExistingCheckoutItem(item),
    );

    const totals = await this.computeTotals(
      businessId,
      mappedItems,
      Number(checkout.taxAmount.toString()),
      Number(checkout.discountAmount.toString()),
    );

    await this.checkoutRepository.update(businessId, checkoutId, {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
      balanceDue: totals.balanceDue,
      remainingAmount: totals.balanceDue,
    });

    const refreshed = await this.checkoutRepository.findById(
      businessId,
      checkoutId,
    );
    return toCheckoutResponse(refreshed!);
  }

  private async computeTotals(
    businessId: string,
    items: CheckoutItemInput[],
    taxAmountInput: number,
    discountAmountInput: number,
  ) {
    const financialSettings =
      await this.financialSettingsService.getSettingsForBusiness(businessId);
    const subtotalPreview = items.reduce(
      (sum, item) => sum + Number(item.totalPrice.toString()),
      0,
    );
    const taxAmount =
      taxAmountInput ||
      computeDefaultTaxAmount(
        subtotalPreview,
        financialSettings.taxesAndCurrency.defaultTaxRate,
        financialSettings.taxesAndCurrency.pricesIncludeTax,
      );
    const discountAmount = discountAmountInput;
    const totals = calculateInvoiceTotals({
      items: items.map((i) => ({
        quantity: Number(i.quantity.toString()),
        unitPrice: Number(i.unitPrice.toString()),
      })),
      taxAmount,
      discountAmount,
    });

    return {
      subtotal: new Prisma.Decimal(totals.subtotal.toFixed(2)),
      taxAmount: new Prisma.Decimal(totals.taxAmount.toFixed(2)),
      discountAmount: new Prisma.Decimal(totals.discountAmount.toFixed(2)),
      totalAmount: new Prisma.Decimal(totals.totalAmount.toFixed(2)),
      balanceDue: new Prisma.Decimal(totals.totalAmount.toFixed(2)),
      items,
    };
  }

  private async mapItemInputs(
    businessId: string,
    items: CheckoutItemInputDto[],
  ): Promise<CheckoutItemInput[]> {
    const mapped: CheckoutItemInput[] = [];
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item.serviceId) {
        const service = await this.serviceRepository.findById(
          businessId,
          item.serviceId,
        );
        if (!service) {
          throw new AppException(
            ErrorCode.SERVICE_NOT_FOUND,
            'Service not found',
            HttpStatus.NOT_FOUND,
          );
        }
      }
      const quantity = item.quantity;
      const unitPrice = item.unitPrice;
      mapped.push({
        lineType: item.lineType ?? InvoiceLineType.SERVICE,
        serviceId: item.serviceId ?? null,
        productId: item.productId ?? null,
        variantId: item.variantId ?? null,
        staffUserId: item.staffUserId ?? null,
        title: item.title,
        description: item.description ?? null,
        quantity: new Prisma.Decimal(quantity),
        unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
        totalPrice: new Prisma.Decimal((quantity * unitPrice).toFixed(2)),
        sortOrder: index,
      });
    }
    return mapped;
  }

  private async assertContact(businessId: string, contactId: string) {
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

  private async requireOpenOrClosedCheckout(businessId: string, id: string) {
    const checkout = await this.checkoutRepository.findById(businessId, id);
    if (!checkout) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Checkout not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return checkout;
  }

  private mapExistingCheckoutItem(
    item: CheckoutWithRelations['items'][number],
  ): CheckoutItemInput {
    return {
      lineType: item.lineType,
      serviceId: item.serviceId,
      productId: item.productId,
      variantId: item.variantId,
      staffUserId: item.staffUserId,
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      sortOrder: item.sortOrder,
    };
  }

  private async requireEditableCheckout(businessId: string, id: string) {
    const checkout = await this.requireOpenOrClosedCheckout(businessId, id);
    if (checkout.status !== InvoiceStatus.OPEN) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_PAYABLE,
        'Only open sales can be edited',
        HttpStatus.BAD_REQUEST,
      );
    }
    return checkout;
  }
}
