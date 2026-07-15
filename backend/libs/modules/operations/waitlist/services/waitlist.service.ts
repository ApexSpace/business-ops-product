import { HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  AppointmentSource,
  AppointmentStatus,
  BookingWaitlistSource,
  BookingWaitlistStatus,
  BusinessMemberRole,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { hasStaffPermission } from '@app/modules/platform/membership/permissions/staff-permission.registry';
import { OnlineBookingSettingsRepository } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import { AppointmentsService } from '@app/modules/operations/appointments/services/appointments.service';
import { PublicBookingContactService } from '@app/modules/operations/public-booking/services/public-booking-contact.service';
import {
  BookFromWaitlistDto,
  CreateWaitlistEntryDto,
  ListWaitlistQueryDto,
  WaitlistBookResultDto,
  WaitlistEntryResponseDto,
  WaitlistSummaryDto,
} from '../dto/waitlist.dto';
import { JoinBookingWaitlistDto } from '@app/modules/operations/public-booking/dto/public-booking.dto';
import { toWaitlistEntryResponse } from '../mappers/waitlist.mapper';
import { WaitlistRepository } from '../repositories/waitlist.repository';
import { WaitlistMatchingService } from './waitlist-matching.service';
import {
  parseWaitlistMetadata,
  type WaitlistServiceLineMetadata,
} from '../utils/waitlist-metadata.util';
import { DateTime } from 'luxon';
import { resolveBookingTimezone } from '@app/modules/operations/online-booking-settings/utils/resolve-booking-timezone.util';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly waitlistRepository: WaitlistRepository,
    private readonly matchingService: WaitlistMatchingService,
    private readonly contactRepository: ContactRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly settingsRepository: OnlineBookingSettingsRepository,
    private readonly emailNotificationService: EmailNotificationService,
    @Inject(forwardRef(() => PublicBookingContactService))
    private readonly publicBookingContactService: PublicBookingContactService,
    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
    private readonly auditService: AuditService,
  ) {}

  async assertCanManageWaitlist(
    businessId: string,
    user: RequestUser,
  ): Promise<void> {
    if (
      user.businessRole === BusinessMemberRole.OWNER ||
      user.businessRole === BusinessMemberRole.ADMIN
    ) {
      return;
    }

    if (
      hasStaffPermission(
        user.staffPermissions,
        'appointments.manage_waitlist',
        user.businessRole,
      )
    ) {
      return;
    }

    const membership = await this.membershipRepository.findActiveByUserAndBusiness(
      user.id,
      businessId,
    );
    if (membership?.canManageWaitlist) {
      return;
    }

    throw new AppException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to manage the waitlist',
      HttpStatus.FORBIDDEN,
    );
  }

  async list(
    businessId: string,
    query: ListWaitlistQueryDto,
  ): Promise<{ items: WaitlistEntryResponseDto[]; meta: { total: number; page: number; limit: number } }> {
    const { page, limit, skip } = getPaginationParams(query);
    const { items, total } = await this.waitlistRepository.list({
      businessId,
      status: query.status ? [query.status] : undefined,
      staffId: query.staffId,
      calendarId: query.calendarId,
      preferredDate: query.preferredDate
        ? new Date(`${query.preferredDate}T00:00:00.000Z`)
        : undefined,
      hasOpening: query.hasOpening,
      skip,
      take: limit,
    });

    return {
      items: items.map(toWaitlistEntryResponse),
      meta: { total, page, limit },
    };
  }

  async getSummary(businessId: string): Promise<WaitlistSummaryDto> {
    const [matchedCount, waitingResult] = await Promise.all([
      this.waitlistRepository.countMatched(businessId),
      this.waitlistRepository.list({
        businessId,
        status: [BookingWaitlistStatus.WAITING],
        skip: 0,
        take: 1,
      }),
    ]);

    return {
      matchedCount,
      waitingCount: waitingResult.total,
    };
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<WaitlistEntryResponseDto> {
    const entry = await this.waitlistRepository.findById(businessId, id);
    if (!entry) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Waitlist entry not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toWaitlistEntryResponse(entry);
  }

  async createManual(
    businessId: string,
    dto: CreateWaitlistEntryDto,
    actor: RequestUser,
  ): Promise<WaitlistEntryResponseDto> {
    await this.assertCanManageWaitlist(businessId, actor);
    return this.createEntry({
      businessId,
      dto,
      source: BookingWaitlistSource.STAFF_MANUAL,
      actorUserId: actor.id,
    });
  }

  async joinFromPublicBooking(params: {
    businessId: string;
    businessName: string;
    waitlistEnabled: boolean;
    dto: JoinBookingWaitlistDto;
  }): Promise<{ id: string; status: BookingWaitlistStatus }> {
    if (!params.waitlistEnabled) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Waitlist is not enabled',
        HttpStatus.BAD_REQUEST,
      );
    }

    const service = await this.serviceRepository.findById(
      params.businessId,
      params.dto.serviceId,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const contact = await this.publicBookingContactService.resolveOrCreate(
      params.businessId,
      {
        customerName: params.dto.customerName,
        customerEmail: params.dto.customerEmail,
        phoneCountryCode: params.dto.phoneCountryCode,
        phoneNumber: params.dto.phoneNumber,
        source: 'Public Booking',
      },
    );

    const entry = await this.createEntry({
      businessId: params.businessId,
      dto: {
        contactId: contact.id,
        serviceId: params.dto.serviceId,
        staffId: params.dto.staffId,
        calendarId: params.dto.calendarId,
        preferredDate: params.dto.preferredDate,
        preferredMorning: params.dto.preferredMorning,
        preferredAfternoon: params.dto.preferredAfternoon,
        preferredEvening: params.dto.preferredEvening,
        comments: params.dto.comments,
        additionalServiceIds: params.dto.additionalServiceIds,
      },
      source: BookingWaitlistSource.ONLINE_BOOKING,
    });

    void this.sendJoinNotifications(
      params.businessId,
      params.businessName,
      entry,
      params.dto.customerName,
    ).catch(() => undefined);

    return { id: entry.id, status: entry.status };
  }

  private async createEntry(params: {
    businessId: string;
    dto: CreateWaitlistEntryDto & { contactId: string };
    source: BookingWaitlistSource;
    actorUserId?: string;
  }): Promise<WaitlistEntryResponseDto> {
    const service = await this.serviceRepository.findById(
      params.businessId,
      params.dto.serviceId,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const contact = await this.contactRepository.findById(
      params.businessId,
      params.dto.contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const preferredDate = new Date(`${params.dto.preferredDate}T00:00:00.000Z`);
    const duplicate = await this.waitlistRepository.findDuplicate({
      businessId: params.businessId,
      contactId: params.dto.contactId,
      serviceId: params.dto.serviceId,
      preferredDate,
      staffId: params.dto.staffId ?? null,
    });
    if (duplicate) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This client is already on the waitlist for this date and service',
        HttpStatus.BAD_REQUEST,
      );
    }

    const serviceLines: WaitlistServiceLineMetadata[] = [
      { serviceId: params.dto.serviceId, staffId: params.dto.staffId ?? null },
      ...(params.dto.additionalServiceIds ?? []).map((serviceId) => ({
        serviceId,
        staffId: params.dto.staffId ?? null,
      })),
    ];

    const entry = await this.waitlistRepository.create({
      businessId: params.businessId,
      contactId: params.dto.contactId,
      serviceId: params.dto.serviceId,
      staffId: params.dto.staffId ?? null,
      calendarId: params.dto.calendarId ?? null,
      preferredDate,
      preferredMorning: params.dto.preferredMorning ?? false,
      preferredAfternoon: params.dto.preferredAfternoon ?? false,
      preferredEvening: params.dto.preferredEvening ?? false,
      comments: params.dto.comments?.trim() || null,
      source: params.source,
      metadata: { serviceLines } as unknown as Prisma.InputJsonValue,
    });

    if (params.actorUserId) {
      await this.auditService.log({
        actorUserId: params.actorUserId,
        businessId: params.businessId,
        action: 'waitlist.entry_created',
        entityType: 'BookingWaitlistEntry',
        entityId: entry.id,
      });
    }

    void this.matchingService.recheckEntry(entry).catch(() => undefined);

    return toWaitlistEntryResponse(entry);
  }

  async dismissMatch(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<WaitlistEntryResponseDto> {
    await this.assertCanManageWaitlist(businessId, actor);
    const entry = await this.waitlistRepository.findById(businessId, id);
    if (!entry) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Waitlist entry not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const metadata = parseWaitlistMetadata(entry.metadata);
    const updated = await this.waitlistRepository.update(id, {
      status: BookingWaitlistStatus.WAITING,
      metadata: {
        ...metadata,
        matchedOpenings: [],
        dismissedAt: new Date().toISOString(),
      } as unknown as Prisma.InputJsonValue,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'waitlist.match_dismissed',
      entityType: 'BookingWaitlistEntry',
      entityId: id,
    });

    return toWaitlistEntryResponse(updated);
  }

  async bookFromWaitlist(
    businessId: string,
    id: string,
    dto: BookFromWaitlistDto,
    actor: RequestUser,
  ): Promise<WaitlistBookResultDto> {
    await this.assertCanManageWaitlist(businessId, actor);
    const entry = await this.waitlistRepository.findById(businessId, id);
    if (!entry) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Waitlist entry not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      entry.status !== BookingWaitlistStatus.WAITING &&
      entry.status !== BookingWaitlistStatus.MATCHED
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This waitlist entry has already been booked or closed',
        HttpStatus.BAD_REQUEST,
      );
    }

    const metadata = parseWaitlistMetadata(entry.metadata);
    const matchedSlot =
      metadata.matchedOpenings?.find((slot) => slot.startAt === dto.startAt) ??
      metadata.matchedOpenings?.[0];

    if (!matchedSlot) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No matching opening is available for this entry',
        HttpStatus.BAD_REQUEST,
      );
    }

    const serviceLines =
      metadata.serviceLines?.length
        ? metadata.serviceLines
        : [{ serviceId: entry.serviceId, staffId: entry.staffId }];

    // Claim the entry before creating the appointment so a calendar-mutation
    // recheck cannot revive it with remaining openings on the same day.
    const claimed = await this.waitlistRepository.updateIfOpen(id, {
      status: BookingWaitlistStatus.BOOKED,
      metadata: {
        ...metadata,
        matchedOpenings: [],
        matchedAt: undefined,
      } as unknown as Prisma.InputJsonValue,
    });
    if (!claimed) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This waitlist entry has already been booked or closed',
        HttpStatus.BAD_REQUEST,
      );
    }

    let appointment;
    try {
      appointment = await this.appointmentsService.create(
        businessId,
        {
          contactId: entry.contactId,
          calendarId: dto.calendarId ?? entry.calendarId ?? undefined,
          startAt: matchedSlot.startAt,
          endAt: matchedSlot.endAt,
          assignedToId:
            dto.staffId ??
            matchedSlot.staffId ??
            entry.staffId ??
            undefined,
          services: serviceLines.map((line, index) => ({
            serviceId: line.serviceId,
            assignedToId:
              matchedSlot.serviceLines?.[index]?.staffId ??
              line.staffId ??
              undefined,
            startAt: matchedSlot.serviceLines?.[index]?.startAt,
          })),
          title: entry.service.name,
          source: AppointmentSource.INTERNAL,
          status: AppointmentStatus.CONFIRMED,
        },
        actor,
      );
    } catch (err) {
      await this.waitlistRepository.update(id, {
        status: BookingWaitlistStatus.MATCHED,
        metadata: {
          ...metadata,
          matchedOpenings: metadata.matchedOpenings ?? [],
          matchedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      });
      throw err;
    }

    const updated = await this.waitlistRepository.update(id, {
      status: BookingWaitlistStatus.BOOKED,
      metadata: {
        ...metadata,
        matchedOpenings: [],
        matchedAt: undefined,
        bookedAppointmentId: appointment.id,
      } as unknown as Prisma.InputJsonValue,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'waitlist.booked',
      entityType: 'BookingWaitlistEntry',
      entityId: id,
      metadata: { appointmentId: appointment.id },
    });

    return {
      entry: toWaitlistEntryResponse(updated),
      appointmentId: appointment.id,
    };
  }

  async cancel(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<WaitlistEntryResponseDto> {
    await this.assertCanManageWaitlist(businessId, actor);
    const entry = await this.waitlistRepository.findById(businessId, id);
    if (!entry) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Waitlist entry not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.waitlistRepository.update(id, {
      status: BookingWaitlistStatus.CANCELLED,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'waitlist.cancelled',
      entityType: 'BookingWaitlistEntry',
      entityId: id,
    });

    return toWaitlistEntryResponse(updated);
  }

  private async sendJoinNotifications(
    businessId: string,
    businessName: string,
    entry: WaitlistEntryResponseDto,
    customerName: string,
  ): Promise<void> {
    const context =
      await this.settingsRepository.findBookingContextByBusinessId(businessId);
    const timezone = resolveBookingTimezone(
      context?.timezone,
      context?.business.timezone,
    );
    const preferredDate = DateTime.fromISO(entry.preferredDate, {
      zone: timezone,
    }).toFormat('cccc, LLL d, yyyy');

    const contact = await this.contactRepository.findById(
      businessId,
      entry.contact.id,
    );

    if (contact?.email?.trim()) {
      void this.emailNotificationService
        .enqueueTransactionalEmail({
          businessId,
          emailType: 'booking.waitlist_joined',
          toEmail: contact.email,
          entityType: 'BookingWaitlistEntry',
          entityId: entry.id,
          fromName: businessName,
          idempotencyKey: `waitlist-joined-client-${entry.id}`,
          variables: {
            'business.name': businessName,
            'contact.name': customerName,
            'waitlist.service_name': entry.service.name,
            'waitlist.preferred_date': preferredDate,
            'waitlist.staff_name': entry.staff?.name ?? 'Anyone',
          },
        })
        .catch(() => undefined);
    }

    const members = await this.membershipRepository.findOwnersAndAdmins(
      businessId,
    );
    for (const member of members) {
      if (!member.user.email) continue;
      void this.emailNotificationService
        .enqueueTransactionalEmail({
          businessId,
          emailType: 'booking.waitlist_staff_notification',
          toEmail: member.user.email,
          userId: member.userId,
          entityType: 'BookingWaitlistEntry',
          entityId: entry.id,
          fromName: businessName,
          idempotencyKey: `waitlist-joined-staff-${entry.id}-${member.userId}`,
          variables: {
            'business.name': businessName,
            'contact.name': customerName,
            'waitlist.service_name': entry.service.name,
            'waitlist.preferred_date': preferredDate,
            'waitlist.staff_name': entry.staff?.name ?? 'Anyone',
          },
        })
        .catch(() => undefined);
    }
  }
}
