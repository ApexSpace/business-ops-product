import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MembershipPlanType, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import type { RootConfig } from '@app/core/config/configuration';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateMembershipPlanDto,
  MembershipPlanResponseDto,
  ReorderMembershipPlansDto,
  UpdateAdvancedDto,
  UpdateAgreementDto,
  UpdateDiscountsDto,
  UpdatePlanDetailsDto,
  UpdatePlanOnlineSalesDto,
  UpdateServiceGroupsDto,
} from '../dto/membership.dto';
import { toMembershipPlan } from '../mappers/membership.mapper';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';
import { MembershipSettingsRepository } from '../repositories/membership-settings.repository';
import { MembershipSettingsService } from './membership-settings.service';
import { MembershipStripeService } from './membership-stripe.service';

@Injectable()
export class MembershipPlansService {
  private readonly logger = new Logger(MembershipPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planRepository: MembershipPlanRepository,
    private readonly settingsRepository: MembershipSettingsRepository,
    private readonly settingsService: MembershipSettingsService,
    private readonly stripeService: MembershipStripeService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  async listPlans(
    businessId: string,
    includeArchived = false,
  ): Promise<MembershipPlanResponseDto[]> {
    const rows = await this.planRepository.findMany(
      businessId,
      includeArchived,
    );
    const slug = await this.resolveSlug(businessId);
    return Promise.all(
      rows.map(async (row) =>
        toMembershipPlan(
          row,
          row.availableOnline && slug
            ? this.buildDirectLink(slug, row.id)
            : null,
        ),
      ),
    );
  }

  async getPlan(
    businessId: string,
    planId: string,
  ): Promise<MembershipPlanResponseDto> {
    const row = await this.assertPlan(businessId, planId);
    const slug = await this.resolveSlug(businessId);
    return toMembershipPlan(
      row,
      row.availableOnline && slug ? this.buildDirectLink(slug, row.id) : null,
    );
  }

  async createPlan(
    businessId: string,
    dto: CreateMembershipPlanDto,
    actor: RequestUser,
  ): Promise<MembershipPlanResponseDto> {
    const sortOrder = await this.planRepository.nextSortOrder(businessId);
    const defaultPrice =
      dto.planType === MembershipPlanType.ACCOUNT_CREDIT ? 0 : 0;

    let row = await this.planRepository.create(businessId, {
      name: dto.name.trim(),
      planType: dto.planType,
      price: new Prisma.Decimal(defaultPrice.toFixed(2)),
      sortOrder,
    });

    try {
      const stripeIds = await this.stripeService.createProductAndPrice(
        businessId,
        row,
      );
      row = await this.planRepository.update(businessId, row.id, {
        stripeProductId: stripeIds.stripeProductId,
        stripePriceId: stripeIds.stripePriceId,
      });
    } catch (error) {
      this.logger.warn(
        `Stripe product creation skipped for plan ${row.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.created',
      entityType: 'MembershipPlan',
      entityId: row.id,
    });

    return toMembershipPlan(row);
  }

  async updatePlanDetails(
    businessId: string,
    planId: string,
    dto: UpdatePlanDetailsDto,
    actor: RequestUser,
  ): Promise<MembershipPlanResponseDto> {
    const existing = await this.assertPlan(businessId, planId);
    const data: Prisma.MembershipPlanUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.emoji !== undefined) data.emoji = dto.emoji?.trim() || null;
    if (dto.billingIntervalCount !== undefined) {
      data.billingIntervalCount = dto.billingIntervalCount;
    }
    if (dto.billingIntervalUnit !== undefined) {
      data.billingIntervalUnit = dto.billingIntervalUnit;
    }
    if (dto.chargeServiceTax !== undefined) {
      data.chargeServiceTax = dto.chargeServiceTax;
    }
    if (dto.servicesExpireAfterDays !== undefined) {
      data.servicesExpireAfter = dto.servicesExpireAfterDays;
    }
    if (dto.creditAmount !== undefined) {
      data.creditAmount =
        dto.creditAmount == null
          ? null
          : new Prisma.Decimal(dto.creditAmount.toFixed(2));
    }

    if (dto.price !== undefined) {
      const newPrice = new Prisma.Decimal(dto.price.toFixed(2));
      data.price = newPrice;

      const activeCount = await this.planRepository.countActiveMemberships(
        businessId,
        planId,
      );
      if (
        activeCount > 0 &&
        !newPrice.equals(existing.price) &&
        existing.stripeProductId
      ) {
        try {
          const newPriceId = await this.stripeService.schedulePriceChange(
            businessId,
            existing,
            newPrice,
          );
          data.stripePriceId = newPriceId;
        } catch (error) {
          this.logger.warn(
            `Failed to schedule Stripe price change for plan ${planId}`,
          );
        }
      } else if (activeCount === 0 && existing.stripeProductId) {
        try {
          const stripeIds = await this.stripeService.createProductAndPrice(
            businessId,
            { ...existing, price: newPrice },
          );
          data.stripePriceId = stripeIds.stripePriceId;
        } catch {
          /* stripe optional */
        }
      }
    }

    const row = await this.planRepository.update(businessId, planId, data);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.details_updated',
      entityType: 'MembershipPlan',
      entityId: planId,
    });

    const slug = await this.resolveSlug(businessId);
    return toMembershipPlan(
      row,
      row.availableOnline && slug ? this.buildDirectLink(slug, row.id) : null,
    );
  }

  async updateServiceGroups(
    businessId: string,
    planId: string,
    dto: UpdateServiceGroupsDto,
    actor: RequestUser,
  ): Promise<MembershipPlanResponseDto> {
    await this.assertPlan(businessId, planId);

    for (const group of dto.groups) {
      await this.assertServices(businessId, group.serviceIds);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.membershipServiceGroup.deleteMany({ where: { planId } });

      for (let i = 0; i < dto.groups.length; i++) {
        const group = dto.groups[i];
        await tx.membershipServiceGroup.create({
          data: {
            planId,
            quantity: group.quantity,
            groupPrice:
              group.groupPrice != null
                ? new Prisma.Decimal(group.groupPrice.toFixed(2))
                : null,
            sortOrder: i,
            services: {
              create: group.serviceIds.map((serviceId) => ({ serviceId })),
            },
          },
        });
      }
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.service_groups_updated',
      entityType: 'MembershipPlan',
      entityId: planId,
    });

    return this.getPlan(businessId, planId);
  }

  async updateDiscounts(
    businessId: string,
    planId: string,
    dto: UpdateDiscountsDto,
    actor: RequestUser,
  ): Promise<MembershipPlanResponseDto> {
    await this.assertPlan(businessId, planId);
    const row = await this.planRepository.update(businessId, planId, {
      productDiscountPercent: new Prisma.Decimal(
        dto.productDiscountPercent.toFixed(2),
      ),
      serviceDiscountPercent: new Prisma.Decimal(
        dto.serviceDiscountPercent.toFixed(2),
      ),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.discounts_updated',
      entityType: 'MembershipPlan',
      entityId: planId,
    });

    return toMembershipPlan(row);
  }

  async updateAgreement(
    businessId: string,
    planId: string,
    dto: UpdateAgreementDto,
    actor: RequestUser,
  ): Promise<MembershipPlanResponseDto> {
    await this.assertPlan(businessId, planId);
    const row = await this.planRepository.update(businessId, planId, {
      requireAgreement: dto.requireAgreement,
      agreementText: dto.agreementText ?? null,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.agreement_updated',
      entityType: 'MembershipPlan',
      entityId: planId,
    });

    return toMembershipPlan(row);
  }

  async updateOnlineSales(
    businessId: string,
    planId: string,
    dto: UpdatePlanOnlineSalesDto,
    actor: RequestUser,
  ): Promise<MembershipPlanResponseDto> {
    const existing = await this.assertPlan(businessId, planId);

    if (dto.availableOnline) {
      const stripeIds = await this.stripeService.ensureStripeProduct(
        businessId,
        existing,
      );
      await this.planRepository.update(businessId, planId, {
        stripeProductId: stripeIds.stripeProductId,
        stripePriceId: stripeIds.stripePriceId,
      });
      await this.settingsRepository.upsert(businessId, {
        onlineSalesEnabled: true,
      });
    }

    const row = await this.planRepository.update(businessId, planId, {
      availableOnline: dto.availableOnline,
      shortDescription: dto.shortDescription?.trim() || null,
      description: dto.description ?? null,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.online_sales_updated',
      entityType: 'MembershipPlan',
      entityId: planId,
    });

    const slug = await this.resolveSlug(businessId);
    return toMembershipPlan(
      row,
      row.availableOnline && slug ? this.buildDirectLink(slug, row.id) : null,
    );
  }

  async updateAdvanced(
    businessId: string,
    planId: string,
    dto: UpdateAdvancedDto,
    actor: RequestUser,
  ): Promise<MembershipPlanResponseDto> {
    await this.assertPlan(businessId, planId);
    const row = await this.planRepository.update(businessId, planId, {
      commissionBasis: dto.commissionBasis,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.advanced_updated',
      entityType: 'MembershipPlan',
      entityId: planId,
    });

    return toMembershipPlan(row);
  }

  async duplicatePlan(
    businessId: string,
    planId: string,
    actor: RequestUser,
  ): Promise<MembershipPlanResponseDto> {
    const source = await this.assertPlan(businessId, planId);
    const sortOrder = await this.planRepository.nextSortOrder(businessId);

    const cloned = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.membershipPlan.create({
        data: {
          businessId,
          name: `Copy of ${source.name}`,
          emoji: source.emoji,
          planType: source.planType,
          billingIntervalCount: source.billingIntervalCount,
          billingIntervalUnit: source.billingIntervalUnit,
          price: source.price,
          chargeServiceTax: source.chargeServiceTax,
          servicesExpireAfter: source.servicesExpireAfter,
          creditAmount: source.creditAmount,
          productDiscountPercent: source.productDiscountPercent,
          serviceDiscountPercent: source.serviceDiscountPercent,
          requireAgreement: source.requireAgreement,
          agreementText: source.agreementText,
          availableOnline: false,
          shortDescription: source.shortDescription,
          description: source.description,
          commissionBasis: source.commissionBasis,
          sortOrder,
        },
      });

      for (const group of source.serviceGroups) {
        await tx.membershipServiceGroup.create({
          data: {
            planId: plan.id,
            quantity: group.quantity,
            groupPrice: group.groupPrice,
            sortOrder: group.sortOrder,
            services: {
              create: group.services.map((item) => ({
                serviceId: item.serviceId,
              })),
            },
          },
        });
      }

      return plan;
    });

    try {
      const stripeIds = await this.stripeService.createProductAndPrice(
        businessId,
        cloned,
      );
      await this.planRepository.update(businessId, cloned.id, {
        stripeProductId: stripeIds.stripeProductId,
        stripePriceId: stripeIds.stripePriceId,
      });
    } catch {
      /* stripe optional */
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.duplicated',
      entityType: 'MembershipPlan',
      entityId: cloned.id,
      metadata: { sourcePlanId: planId },
    });

    return this.getPlan(businessId, cloned.id);
  }

  async archivePlan(
    businessId: string,
    planId: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertPlan(businessId, planId);
    const activeCount = await this.planRepository.countActiveMemberships(
      businessId,
      planId,
    );
    if (activeCount > 0) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_PLAN_HAS_ACTIVE_CLIENTS,
        'Cannot archive a plan with active memberships. Cancel all active memberships first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const plan = await this.assertPlan(businessId, planId);
    if (plan.stripeProductId) {
      try {
        await this.stripeService.deactivateProduct(
          businessId,
          plan.stripeProductId,
        );
      } catch {
        /* best effort */
      }
    }

    await this.planRepository.archive(businessId, planId);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.archived',
      entityType: 'MembershipPlan',
      entityId: planId,
    });
  }

  async reorder(
    businessId: string,
    dto: ReorderMembershipPlansDto,
    actor: RequestUser,
  ): Promise<void> {
    await this.planRepository.reorder(businessId, dto.ids);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'membership_plan.reordered',
      entityType: 'MembershipPlan',
      entityId: businessId,
    });
  }

  private async assertPlan(businessId: string, planId: string) {
    const row = await this.planRepository.findById(businessId, planId);
    if (!row) {
      throw new AppException(
        ErrorCode.MEMBERSHIP_PLAN_NOT_FOUND,
        'Membership plan not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async assertServices(businessId: string, serviceIds: string[]) {
    const count = await this.prisma.service.count({
      where: {
        businessId,
        id: { in: serviceIds },
        deletedAt: null,
        status: 'ACTIVE',
      },
    });
    if (count !== serviceIds.length) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'One or more services are invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async resolveSlug(businessId: string): Promise<string | null> {
    const settings = await this.settingsRepository.findByBusinessId(businessId);
    if (settings?.publicSlug) return settings.publicSlug;
    if (settings?.onlineSalesEnabled) {
      return this.settingsService.ensurePublicSlug(businessId);
    }
    return null;
  }

  private buildDirectLink(slug: string, planId: string): string {
    const frontendUrl = this.configService.get('app', {
      infer: true,
    }).frontendUrl;
    return `${frontendUrl}/memberships/${slug}/${planId}`;
  }
}
