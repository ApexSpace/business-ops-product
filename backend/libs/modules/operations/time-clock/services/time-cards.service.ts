import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { ListTimeCardsQueryDto, TimeCardSortBy } from '../dto/list-time-cards-query.dto';
import {
  TimeCardDetailDto,
  TimeCardListItemDto,
} from '../dto/time-card-response.dto';
import {
  CreateTimeCardDto,
  UpsertTimeCardBodyDto,
} from '../dto/upsert-time-card.dto';
import {
  computePaidMinutes,
  toTimeCardDetail,
  toTimeCardListItem,
} from '../mappers/time-card.mapper';
import { TimeCardRepository } from '../repositories/time-card.repository';
import {
  combineDateAndTime,
  resolveTimePeriodRange,
} from '../utils/time-display.util';
import { DateTime } from 'luxon';

@Injectable()
export class TimeCardsService {
  constructor(
    private readonly timeCardRepository: TimeCardRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    query: ListTimeCardsQueryDto,
  ): Promise<{
    items: TimeCardListItemDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const timezone = await this.resolveTimezone(businessId);
    const range = resolveTimePeriodRange(
      query.timePeriod,
      timezone,
      query.startDate,
      query.endDate,
    );

    const sortBy =
      query.sortBy === TimeCardSortBy.STAFF
        ? TimeCardSortBy.STAFF
        : TimeCardSortBy.DAY;

    const { items, total } = await this.timeCardRepository.findMany(businessId, {
      skip,
      take,
      userId: query.staffId,
      clockInFrom: range.from,
      clockInTo: range.to,
      sortBy,
    });

    return {
      items: items.map((card) => toTimeCardListItem(card, timezone)),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<TimeCardDetailDto> {
    const card = await this.timeCardRepository.findById(businessId, id);
    if (!card) {
      throw new AppException(
        ErrorCode.TIMECLOCK_CARD_NOT_FOUND,
        'Time card not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const timezone = await this.resolveTimezone(businessId);
    return toTimeCardDetail(card, timezone);
  }

  async create(
    businessId: string,
    dto: CreateTimeCardDto,
    actor: RequestUser,
  ): Promise<TimeCardDetailDto> {
    await this.assertMember(businessId, dto.staffId);
    const timezone = await this.resolveTimezone(businessId);
    const clockInTime = combineDateAndTime(
      dto.date,
      dto.clockInTime,
      timezone,
    );
    let clockOutTime: Date | null = null;
    let paidMinutes: number | null = null;

    if (dto.clockOutTime) {
      clockOutTime = combineDateAndTime(dto.date, dto.clockOutTime, timezone);
      this.assertClockOutAfterClockIn(clockInTime, clockOutTime);
      paidMinutes = computePaidMinutes(clockInTime, clockOutTime);
    } else {
      const openCard = await this.timeCardRepository.findOpenForUser(
        businessId,
        dto.staffId,
      );
      if (openCard) {
        throw new AppException(
          ErrorCode.TIMECLOCK_ALREADY_CLOCKED_IN,
          'Staff member already has an open time card',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const card = await this.timeCardRepository.create(businessId, {
      userId: dto.staffId,
      clockInTime,
      clockOutTime,
      paidMinutes,
      notes: dto.notes ?? null,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'time_card.created',
      entityType: 'TimeCard',
      entityId: card.id,
    });

    return toTimeCardDetail(card, timezone);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpsertTimeCardBodyDto,
    actor: RequestUser,
  ): Promise<TimeCardDetailDto> {
    const existing = await this.timeCardRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.TIMECLOCK_CARD_NOT_FOUND,
        'Time card not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const timezone = await this.resolveTimezone(businessId);
    const dateKey =
      dto.date ??
      toTimeCardListItem(existing, timezone).day;
    const clockInHm =
      dto.clockInTime ??
      this.toHm(existing.clockInTime, timezone);
    const clockInTime = combineDateAndTime(dateKey, clockInHm, timezone);

    let clockOutTime: Date | null = existing.clockOutTime;
    let paidMinutes: number | null = existing.paidMinutes;

    if (dto.clockOutTime !== undefined) {
      if (dto.clockOutTime === '' || dto.clockOutTime == null) {
        clockOutTime = null;
        paidMinutes = null;
      } else {
        clockOutTime = combineDateAndTime(dateKey, dto.clockOutTime, timezone);
        this.assertClockOutAfterClockIn(clockInTime, clockOutTime);
        paidMinutes = computePaidMinutes(clockInTime, clockOutTime);
      }
    } else if (dto.clockInTime && existing.clockOutTime) {
      this.assertClockOutAfterClockIn(clockInTime, existing.clockOutTime);
      paidMinutes = computePaidMinutes(clockInTime, existing.clockOutTime);
      clockOutTime = existing.clockOutTime;
    } else if (dto.clockInTime && !existing.clockOutTime) {
      paidMinutes = null;
    }

    const card = await this.timeCardRepository.update(businessId, id, {
      clockInTime,
      clockOutTime,
      paidMinutes,
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'time_card.updated',
      entityType: 'TimeCard',
      entityId: card.id,
    });

    return toTimeCardDetail(card, timezone);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<void> {
    const existing = await this.timeCardRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.TIMECLOCK_CARD_NOT_FOUND,
        'Time card not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.timeCardRepository.delete(businessId, id);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'time_card.deleted',
      entityType: 'TimeCard',
      entityId: id,
    });
  }

  private async resolveTimezone(businessId: string): Promise<string> {
    const business = await this.businessRepository.findById(businessId);
    return business?.timezone ?? 'UTC';
  }

  private async assertMember(businessId: string, userId: string): Promise<void> {
    const membership = await this.membershipRepository.findActiveByUserAndBusiness(
      userId,
      businessId,
    );
    if (!membership) {
      throw new AppException(
        ErrorCode.ASSIGNEE_NOT_MEMBER,
        'Staff member not found in this business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertClockOutAfterClockIn(clockIn: Date, clockOut: Date): void {
    if (clockOut <= clockIn) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Clock-out time must be after clock-in time',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private toHm(iso: Date, timezone: string): string {
    return DateTime.fromJSDate(iso, { zone: 'utc' })
      .setZone(timezone)
      .toFormat('HH:mm');
  }
}
