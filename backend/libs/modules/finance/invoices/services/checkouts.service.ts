import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessMemberRole,
  InvoiceLineType,
  InvoiceStatus,
  MembershipStatus,
  PayableType,
  Prisma,
  ProductType,
  ServiceStatus,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { hasStaffPermission } from '@app/modules/platform/membership/permissions/staff-permission.registry';
import { FinancialSettingsService } from '@app/modules/platform/business/services/financial-settings.service';
import { computeDefaultTaxAmount } from '@app/modules/platform/business/utils/financial-settings.util';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { ServiceWorkspaceRepository } from '@app/modules/crm/services/repositories/service-workspace.repository';
import { PaymentOrchestratorService } from '@app/modules/finance/payments/orchestration/payment-orchestrator.service';
import { loadInvoicePaymentFields, syncInvoicePaymentFields } from '@app/modules/finance/payments/utils/sync-invoice-payment-fields.util';
import { ProductPickerService } from '@app/modules/finance/products/services/product-picker.service';
import { ProductRepository } from '@app/modules/finance/products/repositories/product.repository';
import { ClientMembershipsService } from '@app/modules/finance/memberships/services/client-memberships.service';
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
import * as SalesStaffAccess from '../utils/sales-staff-access.util';
import {
  CheckoutItemInput,
  CheckoutRepository,
  CheckoutWithRelations,
} from '../repositories/checkout.repository';
import { CheckoutCompletionService } from './checkout-completion.service';
import { CheckoutOffersService } from './checkout-offers.service';
import { OfferRepository } from '@app/modules/finance/offers/repositories/offer.repository';
import { CustomFeeEvaluationService } from '@app/modules/finance/custom-fees/services/custom-fee-evaluation.service';
import { CustomFeeApplicationScope } from '@prisma/client';
import { CheckoutAdvancedSettingsService } from '@app/modules/finance/checkout-advanced-settings/services/checkout-advanced-settings.service';
import { CheckoutAdvancedSettingsResponseDto } from '@app/modules/finance/checkout-advanced-settings/dto/checkout-advanced-settings.dto';

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
    private readonly clientMembershipsService: ClientMembershipsService,
    private readonly auditService: AuditService,
    private readonly checkoutOffersService: CheckoutOffersService,
    private readonly offerRepository: OfferRepository,
    private readonly customFeeEvaluation: CustomFeeEvaluationService,
    private readonly checkoutAdvancedSettings: CheckoutAdvancedSettingsService,
  ) {}

  private async mapCheckoutResponse(
    businessId: string,
    checkout: CheckoutWithRelations,
    cachedSettings?: CheckoutAdvancedSettingsResponseDto,
  ): Promise<CheckoutResponseDto> {
    const advancedSettings =
      cachedSettings ??
      (await this.checkoutAdvancedSettings.getForCheckout(businessId));
    return toCheckoutResponse(checkout, advancedSettings);
  }

  private mergeCheckoutMetadata(
    existing: Prisma.JsonValue | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    return { ...base, ...patch } as Prisma.InputJsonValue;
  }

  async list(
    businessId: string,
    query: ListCheckoutsQueryDto,
    user: RequestUser,
  ): Promise<{
    items: CheckoutResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    SalesStaffAccess.assertCanListSales(user);
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
        staffUserId: SalesStaffAccess.canViewAllSales(user)
          ? undefined
          : user.id,
      },
    );
    const advancedSettings =
      await this.checkoutAdvancedSettings.getForCheckout(businessId);
    return {
      items: items.map((item) => toCheckoutResponse(item, advancedSettings)),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
    user: RequestUser,
  ): Promise<CheckoutResponseDto> {
    await syncInvoicePaymentFields(this.prisma, businessId, id);
    let checkout = await this.requireOpenOrClosedCheckout(businessId, id);
    if (
      checkout.status === InvoiceStatus.OPEN &&
      checkout.balanceDue.lessThanOrEqualTo(0) &&
      checkout.paidAmount.greaterThan(0)
    ) {
      await this.checkoutCompletion.finalizeCheckoutIfPaid(
        businessId,
        id,
        user.id,
      );
      checkout = await this.requireOpenOrClosedCheckout(businessId, id);
    }
    SalesStaffAccess.assertCanViewCheckout(user, checkout);
    return this.mapCheckoutResponse(businessId, checkout);
  }

  async create(
    businessId: string,
    dto: CreateCheckoutDto,
    actor: RequestUser,
  ): Promise<CheckoutResponseDto> {
    await this.assertContact(businessId, dto.contactId);

    if (dto.appointmentId) {
      const existingForAppointment = await this.prisma.invoice.findFirst({
        where: {
          businessId,
          appointmentId: dto.appointmentId,
          kind: 'CHECKOUT',
          deletedAt: null,
          status: { in: [InvoiceStatus.OPEN, InvoiceStatus.PAID] },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
      });
      if (existingForAppointment?.status === InvoiceStatus.PAID) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'This appointment already has a completed sale',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (existingForAppointment?.status === InvoiceStatus.OPEN) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'This appointment already has an open checkout. Continue the existing sale instead of creating a new one.',
          HttpStatus.CONFLICT,
        );
      }
    }

    const items = dto.items?.length
      ? await this.mapItemInputs(businessId, dto.items)
      : [];
    const merged = await this.customFeeEvaluation.mergeEntireSaleFeeItems(
      businessId,
      items,
    );
    const totals = await this.computeTotals(businessId, merged.items, 0, 0);
    const { invoiceNumber, displaySequence } =
      await this.financialSettingsService.allocateCheckoutNumber(businessId);

    const checkout = await this.checkoutRepository.create(
      businessId,
      {
        contactId: dto.contactId,
        appointmentId: dto.appointmentId ?? null,
        invoiceNumber,
        displaySequence,
        issueDate: new Date(),
        notes: dto.notes?.trim() || null,
        ...totals,
        items: merged.items,
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

    return this.mapCheckoutResponse(businessId, checkout);
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

    const baseItems = dto.items
      ? await this.mapItemInputs(businessId, dto.items)
      : existing.items.map((item, index) => ({
          ...this.mapExistingCheckoutItem(item),
          sortOrder: index,
        }));

    const merchandiseItems = baseItems.filter((item) => {
      const scope = (item.metadata as Record<string, unknown> | undefined)
        ?.customFeeScope;
      return scope !== CustomFeeApplicationScope.PAYMENT_METHOD;
    });
    const merged = await this.customFeeEvaluation.mergeEntireSaleFeeItems(
      businessId,
      merchandiseItems,
    );

    await this.checkoutRepository.replaceItems(id, merged.items);

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
      merged.items,
      taxAmount,
      discountAmount,
    );

    const updated = await this.checkoutRepository.update(businessId, id, {
      contact: dto.contactId ? { connect: { id: dto.contactId } } : undefined,
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

    return this.mapCheckoutResponse(businessId, updated);
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
    let unitPrice = Number(service.price?.toString() ?? '0');
    let metadata: Prisma.InputJsonValue | undefined;

    if (dto.clientMembershipId || dto.membershipServiceGroupId) {
      if (!dto.clientMembershipId || !dto.membershipServiceGroupId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'clientMembershipId and membershipServiceGroupId must both be set to redeem a membership service',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!checkout.contactId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Assign a client to the sale before redeeming a membership service',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.assertMembershipRedemptionAvailable(
        businessId,
        checkout.contactId,
        dto.serviceId,
        dto.clientMembershipId,
        dto.membershipServiceGroupId,
      );
      unitPrice = 0;
      metadata = {
        membershipRedemption: true,
        clientMembershipId: dto.clientMembershipId,
        membershipServiceGroupId: dto.membershipServiceGroupId,
      };
    } else if (checkout.contactId) {
      unitPrice = await this.applyServiceMemberDiscount(
        businessId,
        checkout.contactId,
        unitPrice,
      );
    }

    const advSettings = await this.checkoutAdvancedSettings.ensureRow(businessId);
    if (advSettings.requireStaffForServices && !dto.staffUserId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'staffUserId is required for service lines',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newItem: CheckoutItemInput = {
      lineType: InvoiceLineType.SERVICE,
      serviceId: service.id,
      staffUserId: dto.staffUserId ?? null,
      title: metadata ? `${service.name} (Membership)` : service.name,
      description: service.description,
      quantity: new Prisma.Decimal(quantity),
      unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
      totalPrice: new Prisma.Decimal((quantity * unitPrice).toFixed(2)),
      sortOrder: checkout.items.length,
      metadata,
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
    const product = await this.productRepository.findByIdWithDetail(
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
    if (product.category?.isNonRetail) {
      SalesStaffAccess.assertCanSellNonRetail(actor);
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

    const advSettings = await this.checkoutAdvancedSettings.ensureRow(businessId);
    if (
      (product.assignStaffToSale || advSettings.requireStaffForProducts) &&
      !dto.staffUserId
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'staffUserId is required for this product',
        HttpStatus.BAD_REQUEST,
      );
    }

    const quantity = dto.quantity ?? 1;
    let unitPrice = Number(resolveProductPrice(product, variant));
    if (checkout.contactId) {
      unitPrice = await this.applyProductMemberDiscount(
        businessId,
        checkout.contactId,
        unitPrice,
      );
    }
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

  async listProductsForPicker(
    businessId: string,
    search: string | undefined,
    user: RequestUser,
  ) {
    const items = await this.productPickerService.listSellable(
      businessId,
      search,
    );
    const canSellNonRetail =
      user.businessRole === BusinessMemberRole.OWNER ||
      user.businessRole === BusinessMemberRole.ADMIN ||
      hasStaffPermission(
        user.staffPermissions,
        'sales.sell_non_retail',
        user.businessRole,
      );
    return {
      items: canSellNonRetail
        ? items
        : items.filter((item) => !item.isNonRetail),
    };
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

    const advSettings = await this.checkoutAdvancedSettings.ensureRow(businessId);
    if (advSettings.requireStaffForGiftCards && !dto.staffUserId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'staffUserId is required for gift card lines',
        HttpStatus.BAD_REQUEST,
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
      staffUserId: dto.staffUserId ?? null,
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

    const advSettings = await this.checkoutAdvancedSettings.ensureRow(businessId);
    if (advSettings.requireStaffForPackages && !dto.staffUserId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'staffUserId is required for package lines',
        HttpStatus.BAD_REQUEST,
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
      staffUserId: dto.staffUserId ?? null,
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
    return this.mapCheckoutResponse(businessId, updated!);
  }

  async close(
    businessId: string,
    id: string,
    dto: CloseCheckoutDto,
    actor: RequestUser,
  ) {
    await syncInvoicePaymentFields(this.prisma, businessId, id);
    const checkout = await this.requireEditableCheckout(businessId, id);
    if (checkout.items.length === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Add at least one line item before closing the sale',
        HttpStatus.BAD_REQUEST,
      );
    }

    const balanceDue = checkout.balanceDue;
    if (balanceDue.lessThanOrEqualTo(0)) {
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
      const refreshed = await this.checkoutRepository.findById(businessId, id);
      return {
        checkout: await this.mapCheckoutResponse(businessId, refreshed!),
        completed: true,
        paymentIds: [],
        stripeTenders: [],
      };
    }

    if (checkout.totalAmount.lessThanOrEqualTo(0)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Sale total must be greater than zero',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tipAmount = dto.tipAmount ?? 0;
    if (tipAmount < 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Tip amount cannot be negative',
        HttpStatus.BAD_REQUEST,
      );
    }

    const advancedSettingsRow =
      await this.checkoutAdvancedSettings.ensureRow(businessId);
    const productIds = [
      ...new Set(
        checkout.items
          .map((item) => item.productId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const productAssignMap: Record<string, boolean> = {};
    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { businessId, id: { in: productIds }, deletedAt: null },
        select: { id: true, assignStaffToSale: true },
      });
      for (const product of products) {
        productAssignMap[product.id] = product.assignStaffToSale;
      }
    }
    this.checkoutAdvancedSettings.assertStaffRequirements(
      advancedSettingsRow,
      checkout,
      productAssignMap,
    );

    for (const tender of dto.tenders) {
      this.checkoutAdvancedSettings.assertPaymentMethodAllowed(
        advancedSettingsRow,
        tender.method,
        tender.reference,
      );
    }

    const refreshedForFees = await this.applyPaymentMethodFeesBeforeClose(
      businessId,
      checkout.id,
      dto.tenders,
    );

    const checkoutAfterFees = await this.checkoutRepository.findById(
      businessId,
      id,
    );
    if (!checkoutAfterFees) {
      throw new AppException(
        ErrorCode.INVOICE_NOT_FOUND,
        'Checkout not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const due = checkoutAfterFees.balanceDue;
    const tipDecimal = new Prisma.Decimal(tipAmount.toFixed(2));
    const expectedMin = due.add(tipDecimal);
    const tenderSum = dto.tenders.reduce(
      (sum, tender) => sum.add(new Prisma.Decimal(tender.amount.toFixed(2))),
      new Prisma.Decimal(0),
    );

    if (tenderSum.lessThan(due)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment amount is less than balance due',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tenderSum.add(new Prisma.Decimal('0.01')).lessThan(expectedMin)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Payment amount must cover balance due plus tip',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.checkoutRepository.update(businessId, id, {
      metadata: this.mergeCheckoutMetadata(checkoutAfterFees.metadata, {
        tipAmount: Number(tipDecimal.toFixed(2)),
      }),
    });

    const adjustedTenders = dto.tenders.map((tender) => {
      const surcharge = refreshedForFees.surchargeByMethod.get(tender.method);
      if (!surcharge || surcharge.lte(0)) {
        return tender;
      }
      return {
        ...tender,
        amount: Number(
          new Prisma.Decimal(tender.amount).add(surcharge).toFixed(2),
        ),
      };
    });

    const result = await this.paymentOrchestrator.collectPayment({
      businessId,
      payableType: PayableType.INVOICE,
      payableId: checkout.id,
      tenders: adjustedTenders.map((t) => ({
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
      tipAmount,
    });

    await this.checkoutCompletion.finalizeCheckoutIfPaid(
      businessId,
      checkout.id,
      actor.id,
    );

    if (result.completed) {
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
      checkout: await this.mapCheckoutResponse(businessId, refreshed!),
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
    const removed = await this.checkoutRepository.deleteItem(
      checkoutId,
      lineId,
    );
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

  async applyOffer(
    businessId: string,
    checkoutId: string,
    offerId: string,
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

    const offerResult = await this.checkoutOffersService.applyManualOffer(
      businessId,
      checkout,
      offerId,
    );

    await this.checkoutRepository.update(businessId, checkoutId, {
      metadata: offerResult.metadata,
    });

    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  async removeAppliedOffer(
    businessId: string,
    checkoutId: string,
    offerId: string,
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

    const offerResult = await this.checkoutOffersService.removeOffer(
      businessId,
      checkout,
      offerId,
    );

    await this.checkoutRepository.update(businessId, checkoutId, {
      metadata: offerResult.metadata,
    });

    return this.recalculateAndReturn(businessId, checkoutId, actor.id);
  }

  async listStaffOffersForPicker(businessId: string) {
    const offers =
      await this.offerRepository.findEnabledWithDiscounts(businessId);
    return offers
      .filter((offer) => offer.applicationMode === 'STAFF_ONLY')
      .map((offer) => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
      }));
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

    const merged = await this.customFeeEvaluation.mergeEntireSaleFeeItems(
      businessId,
      mappedItems,
    );
    await this.checkoutRepository.replaceItems(checkoutId, merged.items);

    const offerResult = await this.checkoutOffersService.evaluateForCheckout(
      businessId,
      checkout,
    );

    const totals = await this.computeTotals(
      businessId,
      merged.items,
      Number(checkout.taxAmount.toString()),
      offerResult.totalOfferDiscount,
    );

    const paymentFields = await loadInvoicePaymentFields(
      this.prisma,
      businessId,
      checkoutId,
      totals.totalAmount,
      checkout.status,
      { closedAt: checkout.closedAt, kind: checkout.kind },
    );

    await this.checkoutRepository.update(businessId, checkoutId, {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
      balanceDue: paymentFields.balanceDue,
      remainingAmount: paymentFields.remainingAmount,
      paidAmount: paymentFields.paidAmount,
      paymentStatus: paymentFields.paymentStatus,
      status:
        checkout.status === InvoiceStatus.VOID
          ? InvoiceStatus.VOID
          : paymentFields.status,
      lastPaymentAt: paymentFields.lastPaymentAt,
      metadata: offerResult.metadata,
    });

    if (
      paymentFields.balanceDue.lessThanOrEqualTo(0) &&
      paymentFields.paidAmount.greaterThan(0)
    ) {
      await this.checkoutCompletion.finalizeCheckoutIfPaid(
        businessId,
        checkoutId,
        _actorUserId,
      );
    }

    const refreshed = await this.checkoutRepository.findById(
      businessId,
      checkoutId,
    );
    return this.mapCheckoutResponse(businessId, refreshed!);
  }

  private async computeTotals(
    businessId: string,
    items: CheckoutItemInput[],
    taxAmountInput: number,
    discountAmountInput: number,
  ) {
    const { merchandiseItems, manualCustomItems, systemFeeItems } =
      this.customFeeEvaluation.splitCheckoutItems(items);
    const merchandiseSubtotal = this.customFeeEvaluation
      .sumItemTotals(merchandiseItems)
      .add(this.customFeeEvaluation.sumItemTotals(manualCustomItems));
    const feeSubtotal = this.customFeeEvaluation.sumItemTotals(systemFeeItems);

    const financialSettings =
      await this.financialSettingsService.getSettingsForBusiness(businessId);
    const taxAmount =
      taxAmountInput ||
      computeDefaultTaxAmount(
        Number(merchandiseSubtotal.toString()),
        financialSettings.taxesAndCurrency.defaultTaxRate,
        financialSettings.taxesAndCurrency.pricesIncludeTax,
      );
    const discountAmount = discountAmountInput;
    const subtotal = merchandiseSubtotal.add(feeSubtotal);
    const totalAmount = subtotal
      .add(new Prisma.Decimal(taxAmount))
      .sub(new Prisma.Decimal(discountAmount));

    return {
      subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
      taxAmount: new Prisma.Decimal(Number(taxAmount).toFixed(2)),
      discountAmount: new Prisma.Decimal(Number(discountAmount).toFixed(2)),
      totalAmount: totalAmount.lessThan(0)
        ? new Prisma.Decimal(0)
        : new Prisma.Decimal(totalAmount.toFixed(2)),
      balanceDue: totalAmount.lessThan(0)
        ? new Prisma.Decimal(0)
        : new Prisma.Decimal(totalAmount.toFixed(2)),
      items,
    };
  }

  private async applyPaymentMethodFeesBeforeClose(
    businessId: string,
    checkoutId: string,
    tenders: CloseCheckoutDto['tenders'],
  ) {
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
    const merged = await this.customFeeEvaluation.mergeEntireSaleFeeItems(
      businessId,
      mappedItems.filter((item) => {
        const scope = (item.metadata as Record<string, unknown> | undefined)
          ?.customFeeScope;
        return scope !== CustomFeeApplicationScope.PAYMENT_METHOD;
      }),
    );

    const { items: paymentMethodFeeItems, surchargeByMethod } =
      await this.customFeeEvaluation.buildPaymentMethodFeeItems(
        businessId,
        tenders.map((tender) => ({
          method: tender.method,
          amount: tender.amount,
        })),
        merged.items.length,
      );

    const allItems = [...merged.items, ...paymentMethodFeeItems];
    await this.checkoutRepository.replaceItems(checkoutId, allItems);

    const offerResult = await this.checkoutOffersService.evaluateForCheckout(
      businessId,
      checkout,
    );
    const totals = await this.computeTotals(
      businessId,
      allItems,
      Number(checkout.taxAmount.toString()),
      offerResult.totalOfferDiscount,
    );

    const paymentFields = await loadInvoicePaymentFields(
      this.prisma,
      businessId,
      checkoutId,
      totals.totalAmount,
      checkout.status,
      { closedAt: checkout.closedAt, kind: checkout.kind },
    );

    await this.checkoutRepository.update(businessId, checkoutId, {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
      balanceDue: paymentFields.balanceDue,
      remainingAmount: paymentFields.remainingAmount,
      paidAmount: paymentFields.paidAmount,
      paymentStatus: paymentFields.paymentStatus,
      metadata: offerResult.metadata,
    });

    return { surchargeByMethod };
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
      metadata: item.metadata ?? undefined,
    };
  }

  private async assertMembershipRedemptionAvailable(
    businessId: string,
    contactId: string,
    serviceId: string,
    clientMembershipId: string,
    membershipServiceGroupId: string,
  ): Promise<void> {
    const available =
      await this.clientMembershipsService.findAvailableForService(
        businessId,
        contactId,
        serviceId,
      );
    const membership = available.find(
      (entry) => entry?.membershipId === clientMembershipId,
    );
    const usageRecord = membership?.usageRecords.find(
      (record) => record.serviceGroupId === membershipServiceGroupId,
    );
    if (!usageRecord || usageRecord.remaining <= 0) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_SLOTS_EXHAUSTED,
        'No remaining membership slots for this service',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async applyServiceMemberDiscount(
    businessId: string,
    contactId: string,
    unitPrice: number,
  ): Promise<number> {
    const discount =
      await this.clientMembershipsService.applyMemberDiscountAtCheckout(
        businessId,
        contactId,
      );
    if (!discount?.hasActiveMembership) {
      return unitPrice;
    }
    const pct = Number(discount.serviceDiscountPercent) / 100;
    return unitPrice * (1 - pct);
  }

  private async applyProductMemberDiscount(
    businessId: string,
    contactId: string,
    unitPrice: number,
  ): Promise<number> {
    const discount =
      await this.clientMembershipsService.applyMemberDiscountAtCheckout(
        businessId,
        contactId,
      );
    if (!discount?.hasActiveMembership) {
      return unitPrice;
    }
    const pct = Number(discount.productDiscountPercent) / 100;
    return unitPrice * (1 - pct);
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
