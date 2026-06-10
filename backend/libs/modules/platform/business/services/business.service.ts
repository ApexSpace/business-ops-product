import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  BusinessMemberRole,
  BusinessStatus,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { IndustriesService } from '@app/modules/crm/industries/services/industries.service';
import { SnapshotApplyService } from '@app/modules/platform/snapshots/services/snapshot-apply.service';
import { SnapshotsService } from '@app/modules/platform/snapshots/services/snapshots.service';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessRepository } from '../repositories/business.repository';
import { toBusinessResponse } from '../mappers/business.mapper';
import { CreateBusinessDto } from '../dto/create-business.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';
import { MembershipService } from '@app/modules/platform/membership/services/membership.service';
import { BusinessAccessService } from './business-access.service';
import { BusinessAccessResolverService } from './business-access-resolver.service';
import { BusinessSubscriptionActionService } from './business-subscription-action.service';
import { BusinessSubscriptionActionAvailabilityService } from './business-subscription-action-availability.service';
import { BusinessSubscriptionPaymentRepository } from '../repositories/business-subscription-payment.repository';
import type { NeedsAttentionFlag } from '../types/business-access-resolution.types';
import {
  toBusinessCreateData,
  toBusinessUpdateData,
} from '../utils/business-profile-data.util';
import {
  extractFinancialSettings,
  mergeFinancialSettings,
  wrapFinancialSettings,
} from '../utils/financial-settings.util';
import {
  currencySymbolForCode,
  normalizeCurrencyCode,
} from '../utils/currency.util';

@Injectable()
export class BusinessService {
  constructor(
    private readonly businessRepository: BusinessRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly industriesService: IndustriesService,
    private readonly snapshotsService: SnapshotsService,
    private readonly snapshotApplyService: SnapshotApplyService,
    private readonly businessAccessService: BusinessAccessService,
    private readonly accessResolver: BusinessAccessResolverService,
    private readonly actionService: BusinessSubscriptionActionService,
    private readonly actionAvailability: BusinessSubscriptionActionAvailabilityService,
    private readonly subscriptionPaymentRepository: BusinessSubscriptionPaymentRepository,
    @Inject(forwardRef(() => MembershipService))
    private readonly membershipService: MembershipService,
  ) {}

  async createPlatform(dto: CreateBusinessDto, actor: RequestUser) {
    const industry = await this.industriesService.resolveForBusiness(
      dto.industryId,
    );

    if (!industry) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No active industry is configured. Add an industry in platform settings first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const snapshot = await this.snapshotsService.resolveForBusiness(
      dto.snapshotId,
    );

    if (!snapshot) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No published snapshot is configured. Add a snapshot in platform settings first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const profileData = toBusinessCreateData({
      ...dto,
      name: dto.name,
      industryId: industry.id,
    });

    const business = await this.prisma.$transaction(async (tx) => {
      const created = await tx.business.create({
        data: {
          ...profileData,
          createdBy: { connect: { id: actor.id } },
        },
        include: { industry: true },
      });
      return created;
    });

    await this.snapshotApplyService.apply(business.id, snapshot.id, actor.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId: business.id,
      action: 'business.created',
      entityType: 'Business',
      entityId: business.id,
      metadata: { name: business.name },
    });

    const hasAccessFields =
      dto.status !== undefined ||
      dto.planGroupId !== undefined ||
      dto.planTierId !== undefined ||
      dto.subscriptionStatus !== undefined ||
      dto.paymentMethod !== undefined ||
      dto.paymentStatus !== undefined ||
      dto.billingCycle !== undefined ||
      dto.currentPeriodStart !== undefined ||
      dto.currentPeriodEnd !== undefined ||
      dto.amount !== undefined ||
      dto.currency !== undefined ||
      dto.notes !== undefined;

    if (hasAccessFields) {
      await this.businessAccessService.createAccessForBusiness(
        business.id,
        {
          status: dto.status,
          planGroupId: dto.planGroupId,
          planTierId: dto.planTierId,
          subscriptionStatus: dto.subscriptionStatus,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentStatus,
          billingCycle: dto.billingCycle,
          currentPeriodStart: dto.currentPeriodStart,
          currentPeriodEnd: dto.currentPeriodEnd,
          amount: dto.amount,
          currency: dto.currency,
          notes: dto.notes,
          syncCapabilitiesFromTier: dto.syncCapabilitiesFromTier,
        },
        actor,
      );
    }

    await this.actionService.emitBusinessCreatedEvents(business.id, actor);

    if (dto.inviteOwner && dto.email?.trim()) {
      await this.membershipService.invite(
        business.id,
        {
          email: dto.email.trim(),
          role: BusinessMemberRole.ADMIN,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
        actor,
      );
    }

    const refreshed = await this.businessRepository.findById(business.id);
    return toBusinessResponse(refreshed ?? business);
  }

  async listPlatform(params: {
    page: number;
    limit: number;
    skip: number;
    status?: BusinessStatus;
    subscriptionStatus?: SubscriptionStatus;
    paymentStatus?: SubscriptionPaymentStatus;
    planGroupId?: string;
    planTierId?: string;
    canAccess?: boolean;
    needsAttention?: NeedsAttentionFlag;
    search?: string;
  }) {
    const search = params.search?.trim() || undefined;
    const hasResolverFilter =
      params.canAccess !== undefined || Boolean(params.needsAttention);

    let businessIds: string[] | undefined;
    if (hasResolverFilter) {
      const { items: candidates } = await this.businessRepository.findMany({
        skip: 0,
        take: 10_000,
        status: params.status,
        subscriptionStatus: params.subscriptionStatus,
        paymentStatus: params.paymentStatus,
        planGroupId: params.planGroupId,
        planTierId: params.planTierId,
        search,
      });

      const filtered: string[] = [];
      for (const business of candidates) {
        const resolution = await this.accessResolver.resolveForBusiness(
          business.id,
        );
        if (
          params.canAccess !== undefined &&
          resolution.canAccessWorkspace !== params.canAccess
        ) {
          continue;
        }
        if (
          params.needsAttention &&
          !resolution.needsAttention.includes(params.needsAttention)
        ) {
          continue;
        }
        filtered.push(business.id);
      }

      businessIds = filtered;
    }

    const { items, total } = await this.businessRepository.findMany({
      skip: hasResolverFilter ? 0 : params.skip,
      take: hasResolverFilter ? businessIds?.length ?? 0 : params.limit,
      status: params.status,
      subscriptionStatus: params.subscriptionStatus,
      paymentStatus: params.paymentStatus,
      planGroupId: params.planGroupId,
      planTierId: params.planTierId,
      search,
      businessIds: hasResolverFilter ? businessIds : undefined,
    });

    const pagedItems = hasResolverFilter
      ? items.slice(params.skip, params.skip + params.limit)
      : items;

    const resolvedItems = await Promise.all(
      pagedItems.map(async (business) => {
        const [resolution, latestPaymentAt, actions] = await Promise.all([
          this.accessResolver.resolveForBusiness(business.id),
          this.subscriptionPaymentRepository.findLatestPaidAt(business.id),
          this.actionAvailability.resolveAvailableActions(business.id),
        ]);
        return toBusinessResponse(business, resolution, {
          latestPaymentAt,
          recommendedActionKey: actions.recommendedAction?.key ?? null,
        });
      }),
    );

    return {
      items: resolvedItems,
      meta: {
        total: hasResolverFilter ? businessIds?.length ?? 0 : total,
        page: params.page,
        limit: params.limit,
      },
    };
  }

  async getPlatform(id: string) {
    const business = await this.businessRepository.findById(id);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const resolution = await this.accessResolver.resolveForBusiness(id);
    return toBusinessResponse(business, resolution);
  }

  async updatePlatform(id: string, dto: UpdateBusinessDto, actor: RequestUser) {
    const existing = await this.businessRepository.findById(id);
    if (!existing) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.industryId) {
      const industry = await this.industriesService.resolveForBusiness(
        dto.industryId,
      );
      if (!industry || industry.id !== dto.industryId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Invalid or inactive industry',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updateData = this.buildUpdateData(existing, dto);

    if (dto.snapshotId) {
      const snapshot = await this.snapshotsService.resolveForBusiness(
        dto.snapshotId,
      );
      if (!snapshot || snapshot.id !== dto.snapshotId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Invalid or unpublished snapshot',
          HttpStatus.BAD_REQUEST,
        );
      }
      updateData.snapshot = { connect: { id: snapshot.id } };
    }

    const business = await this.businessRepository.update(id, updateData);

    if (dto.applySnapshot) {
      const targetSnapshotId = dto.snapshotId ?? existing.snapshotId;
      if (!targetSnapshotId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'No snapshot selected to apply',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.snapshotApplyService.apply(
        business.id,
        targetSnapshotId,
        actor.id,
      );
    }

    const refreshed = await this.businessRepository.findById(business.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId: business.id,
      action: 'business.updated',
      entityType: 'Business',
      entityId: business.id,
      metadata: { ...dto },
    });

    return toBusinessResponse(refreshed ?? business);
  }

  async applySnapshotPlatform(
    businessId: string,
    snapshotId: string,
    actor: RequestUser,
  ) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const snapshot = await this.snapshotsService.resolveForBusiness(snapshotId);
    if (!snapshot || snapshot.id !== snapshotId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid or unpublished snapshot',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.snapshotApplyService.apply(businessId, snapshot.id, actor.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'platform.snapshot.applied',
      entityType: 'Snapshot',
      entityId: snapshot.id,
      metadata: { businessId, name: snapshot.name },
    });

    const refreshed = await this.businessRepository.findById(businessId);
    return toBusinessResponse(refreshed!);
  }

  async deletePlatform(id: string, actor: RequestUser) {
    const business = await this.getPlatform(id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId: business.id,
      action: 'business.deleted',
      entityType: 'Business',
      entityId: business.id,
      metadata: { name: business.name },
    });

    await this.businessRepository.hardDelete(id);

    return { deleted: true, id: business.id };
  }

  async getCurrent(businessId: string) {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const resolution =
      await this.accessResolver.resolveForBusiness(businessId);
    return toBusinessResponse(business, resolution);
  }

  async updateCurrent(
    businessId: string,
    dto: UpdateBusinessDto,
    actor: RequestUser,
  ) {
    return this.updatePlatform(businessId, dto, actor);
  }

  private buildUpdateData(
    existing: Awaited<ReturnType<BusinessRepository['findById']>> & object,
    dto: UpdateBusinessDto,
  ) {
    const data = toBusinessUpdateData(dto);

    const hasProfileExtensions =
      dto.logoUrl !== undefined ||
      dto.addressLine2 !== undefined ||
      dto.taxesAndCurrency !== undefined;

    if (!hasProfileExtensions) {
      return data;
    }

    const current = extractFinancialSettings(existing);
    const patch: Partial<typeof current> = {};

    if (dto.logoUrl !== undefined || dto.addressLine2 !== undefined) {
      patch.businessInformation = {
        ...current.businessInformation,
        ...(dto.logoUrl !== undefined
          ? { logoUrl: dto.logoUrl?.trim() ?? '' }
          : {}),
        ...(dto.addressLine2 !== undefined
          ? { addressLine2: dto.addressLine2?.trim() ?? '' }
          : {}),
      };
    }

    if (dto.taxesAndCurrency) {
      const taxesAndCurrency = {
        ...current.taxesAndCurrency,
        ...dto.taxesAndCurrency,
      };
      if (dto.taxesAndCurrency.currencyCode !== undefined) {
        taxesAndCurrency.currencyCode = normalizeCurrencyCode(
          dto.taxesAndCurrency.currencyCode,
        );
        taxesAndCurrency.currencySymbol = currencySymbolForCode(
          taxesAndCurrency.currencyCode,
        );
      }
      if (taxesAndCurrency.defaultTaxRate !== undefined) {
        taxesAndCurrency.defaultTaxRate = Math.min(
          100,
          Math.max(0, Number(taxesAndCurrency.defaultTaxRate) || 0),
        );
      }
      patch.taxesAndCurrency = taxesAndCurrency;
    }

    data.settings = wrapFinancialSettings(
      existing.settings,
      mergeFinancialSettings(current, patch),
    );

    return data;
  }
}
