import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnyoneAssignmentMode,
  BusinessOnlineBookingSettings,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  isValidBookingSlug,
  slugifyBookingSlug,
} from '@app/modules/operations/public-booking/utils/booking-slug.util';
import {
  buildPublicBookingUrl,
  buildPublicEmbedCode,
  buildPublicEmbedUrl,
  buildPublicServiceBookingUrl,
} from '@app/modules/operations/public-booking/utils/public-booking-url.util';
import { OnlineBookingSettingsRepository } from '../repositories/online-booking-settings.repository';
import {
  UpdateOnlineBookingPreferencesDto,
  UpdateOnlineBookingSetupDto,
  UpdateOnlineBookingStaffSelectionDto,
} from '../dto/online-booking-settings.dto';
import { toOnlineBookingSettingsResponse } from '../mappers/online-booking-settings.mapper';
import { DEFAULT_BUSINESS_HOURS } from '../constants/default-business-hours';
import {
  assertValidBusinessHoursSlots,
  normalizeBusinessHoursSlots,
} from '../utils/business-hours.util';
import { resolveBusinessTimezone } from '@app/common/utils/timezone.util';
import type {
  ReplaceBusinessHoursDto,
  ReplaceStaffWorkScheduleDto,
} from '../dto/online-booking-settings.dto';

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class OnlineBookingSettingsService {
  constructor(
    private readonly repository: OnlineBookingSettingsRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  private getFrontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL', '') ?? '';
  }

  async getSettings(businessId: string) {
    let settings = await this.repository.ensureSettings(businessId);
    await this.ensureBusinessHoursSeeded(businessId);
    settings = await this.syncBookingTimezoneFromBusiness(businessId, settings);
    if (settings.onlineBookingEnabled && !settings.publicSlug) {
      await this.ensurePublicSlug(businessId);
      settings = (await this.repository.findByBusinessId(businessId))!;
    }
    return this.buildResponse(businessId, settings);
  }

  async getBusinessHours(businessId: string) {
    await this.ensureBusinessHoursSeeded(businessId);
    const rows = await this.prisma.businessHours.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return { slots: normalizeBusinessHoursSlots(rows) };
  }

  async updateBusinessHours(
    businessId: string,
    dto: ReplaceBusinessHoursDto,
    actorUserId: string,
  ) {
    try {
      assertValidBusinessHoursSlots(dto.slots);
    } catch (err) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        err instanceof Error ? err.message : 'Invalid business hours',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.repository.replaceBusinessHours(businessId, dto.slots);
    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'online_booking.business_hours_updated',
      entityType: 'BusinessHours',
      entityId: businessId,
    });
    return this.getBusinessHours(businessId);
  }

  async getStaffWorkSchedule(businessId: string, userId: string) {
    await this.ensureMembership(businessId, userId);
    await this.ensureBusinessHoursSeeded(businessId);
    const rows = await this.repository.findStaffSchedules(businessId, userId);
    if (rows.length === 0) {
      const businessHours = await this.prisma.businessHours.findMany({
        where: { businessId },
      });
      return {
        useBusinessHours: true,
        slots: normalizeBusinessHoursSlots(businessHours),
      };
    }
    return {
      useBusinessHours: false,
      slots: normalizeBusinessHoursSlots(rows),
    };
  }

  async updateStaffWorkSchedule(
    businessId: string,
    userId: string,
    dto: ReplaceStaffWorkScheduleDto,
    actorUserId: string,
  ) {
    await this.ensureMembership(businessId, userId);
    if (dto.useBusinessHours) {
      await this.repository.replaceStaffSchedules(businessId, userId, []);
    } else if (dto.slots) {
      try {
        assertValidBusinessHoursSlots(dto.slots);
      } catch (err) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          err instanceof Error ? err.message : 'Invalid work schedule',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.repository.replaceStaffSchedules(
        businessId,
        userId,
        dto.slots,
      );
    } else {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Provide slots or set useBusinessHours to true',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'online_booking.staff_work_schedule_updated',
      entityType: 'StaffWorkSchedule',
      entityId: userId,
    });
    return this.getStaffWorkSchedule(businessId, userId);
  }

  async syncBookingTimezoneFromBusiness(
    businessId: string,
    settings: BusinessOnlineBookingSettings,
  ): Promise<BusinessOnlineBookingSettings> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    const resolved = resolveBusinessTimezone(business?.timezone);
    if (resolved !== settings.timezone) {
      return this.repository.upsert(businessId, { timezone: resolved });
    }
    return settings;
  }

  async updateSetup(
    businessId: string,
    dto: UpdateOnlineBookingSetupDto,
    actorUserId: string,
  ) {
    await this.repository.ensureSettings(businessId);
    let publicSlug: string | undefined;
    if (dto.onlineBookingEnabled) {
      publicSlug = await this.ensurePublicSlug(businessId);
    }
    const settings = await this.repository.upsert(businessId, {
      onlineBookingEnabled: dto.onlineBookingEnabled,
      embedEnabled: dto.embedEnabled,
      overlayEnabled: dto.overlayEnabled,
      ...(dto.widgetSettings !== undefined
        ? { widgetSettings: toJsonValue(dto.widgetSettings) }
        : {}),
      ...(dto.confirmationSettings !== undefined
        ? { confirmationSettings: toJsonValue(dto.confirmationSettings) }
        : {}),
      ...(dto.formSettings !== undefined
        ? { formSettings: toJsonValue(dto.formSettings) }
        : {}),
      ...(publicSlug ? { publicSlug } : {}),
    });
    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'online_booking.setup_updated',
      entityType: 'BusinessOnlineBookingSettings',
      entityId: settings.id,
    });
    return this.buildResponse(businessId, settings);
  }

  async updatePreferences(
    businessId: string,
    dto: UpdateOnlineBookingPreferencesDto,
    actorUserId: string,
  ) {
    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      minimumNoticeMinutes: dto.minimumNoticeMinutes,
      maxBookingDays: dto.maxBookingDays,
      avoidGapsEnabled: dto.avoidGapsEnabled,
      avoidGapsMaxGapMinutes: dto.avoidGapsMaxGapMinutes,
      avoidGapsMinGapMinutes: dto.avoidGapsMinGapMinutes,
      avoidGapsTimeBlockMode: dto.avoidGapsTimeBlockMode,
      avoidGapsEmptyDayMode: dto.avoidGapsEmptyDayMode,
      avoidGapsMultiProviderMode: dto.avoidGapsMultiProviderMode,
      allowMultipleServices: dto.allowMultipleServices,
      allowDuplicateServices: dto.allowDuplicateServices,
      singleStaffOnly: dto.singleStaffOnly,
      collectPhotosEnabled: dto.collectPhotosEnabled,
      photoUploadPrompt: dto.photoUploadPrompt,
      waitlistEnabled: dto.waitlistEnabled,
      slotIntervalMinutes: dto.slotIntervalMinutes,
      bufferBeforeMinutes: dto.bufferBeforeMinutes,
      bufferAfterMinutes: dto.bufferAfterMinutes,
      requireApproval: dto.requireApproval,
      autoConfirm: dto.autoConfirm,
      locationType: dto.locationType,
      locationValue: dto.locationValue,
      ...(dto.formSettings !== undefined
        ? { formSettings: toJsonValue(dto.formSettings) }
        : {}),
      ...(dto.notificationSettings !== undefined
        ? { notificationSettings: toJsonValue(dto.notificationSettings) }
        : {}),
    });
    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'online_booking.preferences_updated',
      entityType: 'BusinessOnlineBookingSettings',
      entityId: settings.id,
    });
    return this.buildResponse(businessId, await this.syncBookingTimezoneFromBusiness(businessId, settings));
  }

  async updateStaffSelection(
    businessId: string,
    dto: UpdateOnlineBookingStaffSelectionDto,
    actorUserId: string,
  ) {
    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      randomizeStaffOrder: dto.randomizeStaffOrder,
      showGenderOptions: dto.showGenderOptions,
      showAnyoneOption: dto.showAnyoneOption,
      anyoneAssignmentMode: dto.anyoneAssignmentMode,
      anyoneExcludedStaffIds: dto.anyoneExcludedStaffIds,
    });
    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'online_booking.staff_selection_updated',
      entityType: 'BusinessOnlineBookingSettings',
      entityId: settings.id,
    });
    return this.buildResponse(businessId, settings);
  }

  async ensurePublicSlug(businessId: string): Promise<string> {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true, displayName: true },
    });
    const canonicalBase = slugifyBookingSlug(
      business.displayName ?? business.name ?? 'booking',
    );
    const existing = await this.repository.findByBusinessId(businessId);
    if (
      existing?.publicSlug &&
      this.slugMatchesBusiness(existing.publicSlug, canonicalBase)
    ) {
      return existing.publicSlug;
    }
    const slug = await this.allocateUniqueSlug(canonicalBase, businessId);
    await this.repository.upsert(businessId, { publicSlug: slug });
    return slug;
  }

  async resolveBusinessBySlug(slug: string) {
    if (!isValidBookingSlug(slug)) {
      throw new AppException(
        ErrorCode.PUBLIC_BOOKING_DISABLED,
        'Booking not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const context = await this.repository.findByPublicSlug(slug);
    if (!context || !context.onlineBookingEnabled) {
      throw new AppException(
        ErrorCode.PUBLIC_BOOKING_DISABLED,
        'Public booking is not available',
        HttpStatus.NOT_FOUND,
      );
    }
    return context;
  }

  buildServiceDirectLink(
    businessSlug: string,
    serviceId: string,
    staffId?: string,
  ) {
    const frontendUrl = this.getFrontendUrl();
    if (!frontendUrl) return null;
    return buildPublicServiceBookingUrl(frontendUrl, businessSlug, {
      serviceId,
      staffId,
    });
  }

  private slugMatchesBusiness(slug: string, base: string): boolean {
    return slug === base || slug.startsWith(`${base}-`);
  }

  private async allocateUniqueSlug(
    base: string,
    businessId: string,
  ): Promise<string> {
    const candidate = isValidBookingSlug(base) ? base : 'booking';
    for (let i = 0; i < 100; i++) {
      const suffix = i === 0 ? '' : `-${i}`;
      const slug = `${candidate}${suffix}`.slice(0, 80);
      if (!isValidBookingSlug(slug)) continue;
      const taken = await this.repository.isSlugTaken(slug, businessId);
      if (!taken) return slug;
    }
    return `bk-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  private async ensureBusinessHoursSeeded(businessId: string): Promise<void> {
    const hours = await this.prisma.businessHours.findMany({
      where: { businessId },
    });
    if (hours.length === 0) {
      await this.repository.replaceBusinessHours(
        businessId,
        DEFAULT_BUSINESS_HOURS,
      );
    }
  }

  private async ensureMembership(
    businessId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.prisma.businessMembership.findFirst({
      where: { businessId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!member) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Staff member not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private buildResponse(
    businessId: string,
    settings: BusinessOnlineBookingSettings,
  ) {
    const frontendUrl = this.getFrontendUrl();
    const publicBookingUrl =
      settings.publicSlug && frontendUrl
        ? buildPublicBookingUrl(frontendUrl, settings.publicSlug)
        : null;
    const embedUrl =
      settings.publicSlug && settings.embedEnabled && frontendUrl
        ? buildPublicEmbedUrl(frontendUrl, settings.publicSlug)
        : null;
    const embedCode =
      settings.publicSlug && settings.embedEnabled && frontendUrl
        ? buildPublicEmbedCode(frontendUrl, settings.publicSlug)
        : null;
    const overlayUrl = publicBookingUrl;
    return toOnlineBookingSettingsResponse({
      settings,
      publicBookingUrl,
      embedUrl,
      embedCode,
      overlayUrl,
    });
  }
}
