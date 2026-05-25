import { HttpStatus, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { AuditService } from '../../audit/services/audit.service';
import { BusinessRepository } from '../../business/repositories/business.repository';
import { PlanRepository } from '../../plans/repositories/plan.repository';
import {
  AssignSubscriptionDto,
  BillingOverviewDto,
  BillingSubscriptionDto,
  UpdateSubscriptionDto,
} from '../dto/billing.dto';
import {
  BusinessSubscriptionRepository,
  SubscriptionWithRelations,
} from '../repositories/business-subscription.repository';

@Injectable()
export class BillingService {
  constructor(
    private readonly subscriptionRepository: BusinessSubscriptionRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly planRepository: PlanRepository,
    private readonly auditService: AuditService,
  ) {}

  async getOverview(): Promise<BillingOverviewDto> {
    const [counts, mrr] = await Promise.all([
      this.subscriptionRepository.countByStatus(),
      this.subscriptionRepository.getMrr(),
    ]);

    return {
      mrr: mrr.toFixed(2),
      activeSubscriptions: counts.ACTIVE,
      trialingSubscriptions: counts.TRIALING,
      pastDueSubscriptions: counts.PAST_DUE,
      canceledSubscriptions: counts.CANCELED,
    };
  }

  async getSubscription(
    businessId: string,
  ): Promise<BillingSubscriptionDto | null> {
    const sub =
      await this.subscriptionRepository.findByBusinessId(businessId);
    return sub ? this.toResponse(sub) : null;
  }

  async listSubscriptions(params: {
    page: number;
    limit: number;
    skip: number;
    status?: SubscriptionStatus;
  }): Promise<{
    items: BillingSubscriptionDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { items, total } = await this.subscriptionRepository.findMany(
      params.skip,
      params.limit,
      params.status,
    );

    return {
      items: items.map((sub) => this.toResponse(sub)),
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async assignSubscription(
    businessId: string,
    dto: AssignSubscriptionDto,
    actor: RequestUser,
  ): Promise<BillingSubscriptionDto> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const plan = await this.planRepository.findById(dto.planId);
    if (!plan) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const existing =
      await this.subscriptionRepository.findByBusinessId(businessId);

    const currentPeriodEnd = dto.currentPeriodEnd
      ? new Date(dto.currentPeriodEnd)
      : null;

    const sub = existing
      ? await this.subscriptionRepository.update(businessId, {
          plan: { connect: { id: dto.planId } },
          status: dto.status ?? existing.status,
          currentPeriodEnd,
          canceledAt:
            dto.status === SubscriptionStatus.CANCELED ? new Date() : null,
        })
      : await this.subscriptionRepository.create({
          businessId,
          planId: dto.planId,
          status: dto.status ?? SubscriptionStatus.TRIALING,
          currentPeriodEnd,
        });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: existing
        ? 'platform.subscription.updated'
        : 'platform.subscription.created',
      entityType: 'BusinessSubscription',
      entityId: sub.id,
      metadata: { planId: dto.planId, status: sub.status },
    });

    return this.toResponse(sub);
  }

  async updateSubscription(
    businessId: string,
    dto: UpdateSubscriptionDto,
    actor: RequestUser,
  ): Promise<BillingSubscriptionDto> {
    const existing =
      await this.subscriptionRepository.findByBusinessId(businessId);
    if (!existing) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Subscription not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.planId) {
      const plan = await this.planRepository.findById(dto.planId);
      if (!plan) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          'Plan not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const updated = await this.subscriptionRepository.update(businessId, {
      ...(dto.planId ? { plan: { connect: { id: dto.planId } } } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.currentPeriodEnd !== undefined
        ? { currentPeriodEnd: new Date(dto.currentPeriodEnd) }
        : {}),
      ...(dto.status === SubscriptionStatus.CANCELED
        ? { canceledAt: new Date() }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'platform.subscription.updated',
      entityType: 'BusinessSubscription',
      entityId: updated.id,
      metadata: { changes: dto },
    });

    return this.toResponse(updated);
  }

  private toResponse(sub: SubscriptionWithRelations): BillingSubscriptionDto {
    return {
      id: sub.id,
      businessId: sub.businessId,
      businessName: sub.business.name,
      businessSlug: sub.business.slug,
      planId: sub.planId,
      planName: sub.plan.name,
      priceMonthly: sub.plan.priceMonthly.toString(),
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: sub.canceledAt,
      createdAt: sub.createdAt,
    };
  }
}
