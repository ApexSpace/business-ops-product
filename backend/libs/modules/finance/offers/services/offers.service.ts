import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DiscountAppliesTo,
  DiscountAmountType,
  OfferApplicationMode,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import {
  CreateOfferDiscountDto,
  CreateOfferDto,
  ListOffersQueryDto,
  OfferResponseDto,
  ReorderOfferDiscountsDto,
  ReorderOffersDto,
  UpdateOfferDetailsDto,
  UpdateOfferDiscountDto,
} from '../dto/offer.dto';
import {
  serializeOfferDateRules,
  toOfferListItem,
  toOfferResponse,
} from '../mappers/offer.mapper';
import { OfferRepository } from '../repositories/offer.repository';
import { OfferCacheService } from './offer-cache.service';

@Injectable()
export class OffersService {
  constructor(
    private readonly offerRepository: OfferRepository,
    private readonly offerCache: OfferCacheService,
    private readonly auditService: AuditService,
  ) {}

  async listOffers(
    businessId: string,
    query: ListOffersQueryDto,
  ): Promise<{
    items: OfferResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { skip, take, page, limit } = getPaginationParams(query);
    const { items, total } = await this.offerRepository.findMany(businessId, {
      skip,
      take,
      search: query.search,
    });
    return {
      items: items.map(toOfferListItem),
      meta: { total, page, limit },
    };
  }

  async getOffer(
    businessId: string,
    offerId: string,
  ): Promise<OfferResponseDto> {
    const row = await this.assertOffer(businessId, offerId);
    return toOfferResponse(row);
  }

  async createOffer(
    businessId: string,
    dto: CreateOfferDto,
    actor: RequestUser,
  ): Promise<OfferResponseDto> {
    const sortOrder = await this.offerRepository.nextSortOrder(businessId);
    const row = await this.offerRepository.create(businessId, {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.created',
      entityType: 'Offer',
      entityId: row.id,
    });

    await this.offerCache.invalidate(businessId);
    return toOfferResponse(row);
  }

  async updateOfferDetails(
    businessId: string,
    offerId: string,
    dto: UpdateOfferDetailsDto,
    actor: RequestUser,
  ): Promise<OfferResponseDto> {
    await this.assertOffer(businessId, offerId);
    const data: Prisma.OfferUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    const applicationMode = dto.applicationMode;
    if (applicationMode !== undefined) {
      data.applicationMode = applicationMode;
    }

    if (dto.offerCode !== undefined || applicationMode !== undefined) {
      const existing = await this.assertOffer(businessId, offerId);
      const mode = applicationMode ?? existing.applicationMode;

      if (mode === OfferApplicationMode.OFFER_CODE) {
        const code = (dto.offerCode ?? existing.offerCode ?? '')
          .trim()
          .toUpperCase();
        if (!code) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Offer code is required when using offer code application mode',
            HttpStatus.BAD_REQUEST,
          );
        }
        await this.assertUniqueOfferCode(businessId, code, offerId);
        data.offerCode = code;
      } else {
        data.offerCode = null;
      }
    }

    if (applicationMode !== undefined) {
      if (applicationMode !== OfferApplicationMode.AUTOMATICALLY) {
        data.autoApptDateEnabled = false;
        data.autoApptDateRules = Prisma.JsonNull;
        data.autoBookingDateEnabled = false;
        data.autoBookingDateRules = Prisma.JsonNull;
        data.autoSaleDateEnabled = false;
        data.autoSaleDateRules = Prisma.JsonNull;
      }
    }

    if (dto.autoApptDateEnabled !== undefined) {
      data.autoApptDateEnabled = dto.autoApptDateEnabled;
    }
    if (dto.autoApptDateRules !== undefined) {
      data.autoApptDateRules =
        serializeOfferDateRules(dto.autoApptDateRules) ?? Prisma.JsonNull;
    }
    if (dto.autoBookingDateEnabled !== undefined) {
      data.autoBookingDateEnabled = dto.autoBookingDateEnabled;
    }
    if (dto.autoBookingDateRules !== undefined) {
      data.autoBookingDateRules =
        serializeOfferDateRules(dto.autoBookingDateRules) ?? Prisma.JsonNull;
    }
    if (dto.autoSaleDateEnabled !== undefined) {
      data.autoSaleDateEnabled = dto.autoSaleDateEnabled;
    }
    if (dto.autoSaleDateRules !== undefined) {
      data.autoSaleDateRules =
        serializeOfferDateRules(dto.autoSaleDateRules) ?? Prisma.JsonNull;
    }

    if (dto.minAmountEnabled !== undefined) {
      data.minAmountEnabled = dto.minAmountEnabled;
    }
    if (dto.minAmount !== undefined) {
      data.minAmount = new Prisma.Decimal(dto.minAmount.toFixed(2));
    }
    if (dto.oncePerClient !== undefined) data.oncePerClient = dto.oncePerClient;
    if (dto.newClientsOnly !== undefined)
      data.newClientsOnly = dto.newClientsOnly;
    if (dto.membershipRequired !== undefined) {
      data.membershipRequired = dto.membershipRequired;
    }
    if (dto.membershipScope !== undefined) {
      data.membershipScope = dto.membershipScope;
    }
    if (dto.specificMembershipPlanIds !== undefined) {
      data.specificMembershipPlanIds = dto.specificMembershipPlanIds;
    }
    if (dto.specificProvidersEnabled !== undefined) {
      data.specificProvidersEnabled = dto.specificProvidersEnabled;
    }
    if (dto.specificProviderIds !== undefined) {
      data.specificProviderIds = dto.specificProviderIds;
    }
    if (dto.commissionBasis !== undefined) {
      data.commissionBasis = dto.commissionBasis;
    }

    const row = await this.offerRepository.update(businessId, offerId, data);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.updated',
      entityType: 'Offer',
      entityId: offerId,
    });

    await this.offerCache.invalidate(businessId);
    return toOfferResponse(row);
  }

  async toggleOffer(
    businessId: string,
    offerId: string,
    actor: RequestUser,
  ): Promise<OfferResponseDto> {
    const existing = await this.assertOffer(businessId, offerId);
    if (!existing.isEnabled) {
      return this.enableOffer(businessId, offerId, actor);
    }
    return this.disableOffer(businessId, offerId, actor);
  }

  async enableOffer(
    businessId: string,
    offerId: string,
    actor: RequestUser,
  ): Promise<OfferResponseDto> {
    const existing = await this.assertOffer(businessId, offerId);
    const discountCount = await this.offerRepository.countDiscounts(offerId);
    if (discountCount === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Add at least one discount before enabling this offer.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const row = await this.offerRepository.update(businessId, offerId, {
      isEnabled: true,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.enabled',
      entityType: 'Offer',
      entityId: offerId,
      metadata: { previousEnabled: existing.isEnabled },
    });

    await this.offerCache.invalidate(businessId);
    return toOfferResponse(row);
  }

  async disableOffer(
    businessId: string,
    offerId: string,
    actor: RequestUser,
  ): Promise<OfferResponseDto> {
    await this.assertOffer(businessId, offerId);
    const row = await this.offerRepository.update(businessId, offerId, {
      isEnabled: false,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.disabled',
      entityType: 'Offer',
      entityId: offerId,
    });

    await this.offerCache.invalidate(businessId);
    return toOfferResponse(row);
  }

  async duplicateOffer(
    businessId: string,
    offerId: string,
    actor: RequestUser,
  ): Promise<OfferResponseDto> {
    const source = await this.assertOffer(businessId, offerId);
    const sortOrder = await this.offerRepository.nextSortOrder(businessId);

    const row = await this.offerRepository.create(businessId, {
      name: `Copy of ${source.name}`,
      description: source.description,
      isEnabled: false,
      sortOrder,
      applicationMode: source.applicationMode,
      offerCode: null,
      autoApptDateEnabled: source.autoApptDateEnabled,
      autoApptDateRules: source.autoApptDateRules ?? Prisma.JsonNull,
      autoBookingDateEnabled: source.autoBookingDateEnabled,
      autoBookingDateRules: source.autoBookingDateRules ?? Prisma.JsonNull,
      autoSaleDateEnabled: source.autoSaleDateEnabled,
      autoSaleDateRules: source.autoSaleDateRules ?? Prisma.JsonNull,
      minAmountEnabled: source.minAmountEnabled,
      minAmount: source.minAmount,
      oncePerClient: source.oncePerClient,
      newClientsOnly: source.newClientsOnly,
      membershipRequired: source.membershipRequired,
      membershipScope: source.membershipScope,
      specificMembershipPlanIds:
        source.specificMembershipPlanIds ?? Prisma.JsonNull,
      specificProvidersEnabled: source.specificProvidersEnabled,
      specificProviderIds: source.specificProviderIds ?? Prisma.JsonNull,
      commissionBasis: source.commissionBasis,
      discounts: {
        create: source.discounts.map((discount) => ({
          appliesTo: discount.appliesTo,
          amountType: discount.amountType,
          amount: discount.amount,
          serviceScope: discount.serviceScope,
          productScope: discount.productScope,
          specificServiceCategoryIds:
            discount.specificServiceCategoryIds ?? Prisma.JsonNull,
          specificServiceIds: discount.specificServiceIds ?? Prisma.JsonNull,
          specificProductCategoryIds:
            discount.specificProductCategoryIds ?? Prisma.JsonNull,
          specificProductIds: discount.specificProductIds ?? Prisma.JsonNull,
          sortOrder: discount.sortOrder,
        })),
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.duplicated',
      entityType: 'Offer',
      entityId: row.id,
      metadata: { sourceOfferId: offerId },
    });

    await this.offerCache.invalidate(businessId);
    return toOfferResponse(row);
  }

  async deleteOffer(
    businessId: string,
    offerId: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertOffer(businessId, offerId);
    await this.offerRepository.delete(businessId, offerId);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.deleted',
      entityType: 'Offer',
      entityId: offerId,
    });

    await this.offerCache.invalidate(businessId);
  }

  async reorderOffers(
    businessId: string,
    dto: ReorderOffersDto,
    actor: RequestUser,
  ): Promise<void> {
    await this.offerRepository.reorder(businessId, dto.ids);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.reordered',
      entityType: 'Offer',
      entityId: businessId,
    });
    await this.offerCache.invalidate(businessId);
  }

  async addDiscount(
    businessId: string,
    offerId: string,
    dto: CreateOfferDiscountDto,
    actor: RequestUser,
  ) {
    await this.assertOffer(businessId, offerId);
    this.validateDiscountRules(dto);

    const sortOrder = await this.offerRepository.countDiscounts(offerId);
    await this.offerRepository.createDiscount(offerId, {
      appliesTo: dto.appliesTo,
      amountType: dto.amountType,
      amount: new Prisma.Decimal(dto.amount.toFixed(2)),
      serviceScope: dto.serviceScope ?? 'ALL',
      productScope: dto.productScope ?? 'ALL',
      specificServiceCategoryIds:
        dto.specificServiceCategoryIds ?? Prisma.JsonNull,
      specificServiceIds: dto.specificServiceIds ?? Prisma.JsonNull,
      specificProductCategoryIds:
        dto.specificProductCategoryIds ?? Prisma.JsonNull,
      specificProductIds: dto.specificProductIds ?? Prisma.JsonNull,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.discount_added',
      entityType: 'Offer',
      entityId: offerId,
    });

    await this.offerCache.invalidate(businessId);
    return this.getOffer(businessId, offerId);
  }

  async updateDiscount(
    businessId: string,
    offerId: string,
    discountId: string,
    dto: UpdateOfferDiscountDto,
    actor: RequestUser,
  ) {
    await this.assertOffer(businessId, offerId);
    this.validateDiscountRules(dto);

    await this.offerRepository.updateDiscount(offerId, discountId, {
      appliesTo: dto.appliesTo,
      amountType: dto.amountType,
      amount: new Prisma.Decimal(dto.amount.toFixed(2)),
      serviceScope: dto.serviceScope ?? 'ALL',
      productScope: dto.productScope ?? 'ALL',
      specificServiceCategoryIds:
        dto.specificServiceCategoryIds ?? Prisma.JsonNull,
      specificServiceIds: dto.specificServiceIds ?? Prisma.JsonNull,
      specificProductCategoryIds:
        dto.specificProductCategoryIds ?? Prisma.JsonNull,
      specificProductIds: dto.specificProductIds ?? Prisma.JsonNull,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.discount_updated',
      entityType: 'Offer',
      entityId: offerId,
      metadata: { discountId },
    });

    await this.offerCache.invalidate(businessId);
    return this.getOffer(businessId, offerId);
  }

  async deleteDiscount(
    businessId: string,
    offerId: string,
    discountId: string,
    actor: RequestUser,
  ) {
    await this.assertOffer(businessId, offerId);
    await this.offerRepository.deleteDiscount(offerId, discountId);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.discount_deleted',
      entityType: 'Offer',
      entityId: offerId,
      metadata: { discountId },
    });

    await this.offerCache.invalidate(businessId);
    return this.getOffer(businessId, offerId);
  }

  async reorderDiscounts(
    businessId: string,
    offerId: string,
    dto: ReorderOfferDiscountsDto,
    actor: RequestUser,
  ) {
    await this.assertOffer(businessId, offerId);
    await this.offerRepository.reorderDiscounts(offerId, dto.orderedIds);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'offer.discounts_reordered',
      entityType: 'Offer',
      entityId: offerId,
    });

    await this.offerCache.invalidate(businessId);
    return this.getOffer(businessId, offerId);
  }

  async getUsageReport(
    businessId: string,
    params: { offerId?: string; startDate?: string; endDate?: string },
  ) {
    const logs = await this.offerRepository.findUsageReport(businessId, {
      offerId: params.offerId,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    });

    const offerName =
      params.offerId && logs[0]?.offer.name
        ? logs[0].offer.name
        : params.offerId
          ? (await this.assertOffer(businessId, params.offerId)).name
          : 'All offers';

    const uses = logs.map((log) => ({
      clientName: formatContactLabel(log.contact),
      saleId: log.saleId,
      usedAt: log.usedAt.toISOString(),
      discountAmount: log.discountAmount?.toString() ?? '0',
    }));

    const totalUses = logs.length;
    const totalDiscountGiven = logs.reduce(
      (sum, log) => sum + Number(log.discountAmount?.toString() ?? 0),
      0,
    );

    return {
      offerName,
      totalUses,
      totalDiscountGiven: totalDiscountGiven.toFixed(2),
      uses,
    };
  }

  private validateDiscountRules(
    dto: CreateOfferDiscountDto | UpdateOfferDiscountDto,
  ) {
    if (
      dto.appliesTo === DiscountAppliesTo.ENTIRE_SALE &&
      dto.amountType === DiscountAmountType.PERCENTAGE
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Entire sale discounts only support fixed dollar amounts.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertUniqueOfferCode(
    businessId: string,
    code: string,
    excludeId?: string,
  ) {
    const existing = await this.offerRepository.findByOfferCodeCaseInsensitive(
      businessId,
      code,
      excludeId,
    );
    if (existing) {
      throw new AppException(
        ErrorCode.OFFER_CODE_EXISTS,
        'This offer code is already in use. Please choose a different code.',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async assertOffer(businessId: string, offerId: string) {
    const row = await this.offerRepository.findById(businessId, offerId);
    if (!row) {
      throw new AppException(
        ErrorCode.OFFER_NOT_FOUND,
        'Offer not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }
}

function formatContactLabel(
  contact: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null,
): string {
  if (!contact) return 'Unknown';
  return (
    contact.displayName?.trim() ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    contact.email ||
    'Unknown'
  );
}
