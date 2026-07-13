import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  AnyoneAssignmentMode,
  AppointmentSource,
  AppointmentStatus,
  Prisma,
  ServicePaymentRequirement,
  StaffGender,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { normalizeTimezone } from '@app/common/utils/timezone.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { AppointmentRepository } from '@app/modules/operations/appointments/repositories/appointment.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { ServiceBookingTimingService } from '@app/modules/crm/services/services/service-booking-timing.service';
import { ServiceWorkspaceRepository } from '@app/modules/crm/services/repositories/service-workspace.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { OnlineBookingSettingsService } from '@app/modules/operations/online-booking-settings/services/online-booking-settings.service';
import type { BusinessBookingContext } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import { OnlineBookingSettingsRepository } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import { resolveEffectiveWeeklyHours } from '@app/modules/operations/online-booking-settings/utils/effective-working-hours.util';
import { resolveGapAvoidancePolicy } from '@app/modules/operations/online-booking-settings/utils/gap-avoidance.util';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  CreatePublicBookingDto,
  PublicBookingAttachPhotosDto,
  PublicBookingAvailabilityQueryDto,
  PublicBookingCatalogCategoryDto,
  PublicBookingConfirmationDto,
  PublicBookingDayAvailabilityDto,
  PublicBookingPhotoConfirmDto,
  PublicBookingPhotoFailDto,
  PublicBookingPhotoUploadDto,
  PublicBookingStaffDto,
} from '../dto/public-booking.dto';
import {
  toPublicBookingBusiness,
  toPublicBookingConfirmation,
} from '../mappers/public-booking.mapper';
import { BusinessAvailabilityService } from './business-availability.service';
import { PublicBookingContactService } from './public-booking-contact.service';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import {
  formatAppointmentDateTime,
  formatContactName,
} from '@app/modules/communications/email/utils/email-variables.util';
import { buildPublicBookingUrl } from '../utils/public-booking-url.util';
import { normalizeServiceLinesValue } from '../utils/parse-service-lines-query.util';
import { ConfigService } from '@nestjs/config';
import { resolveBookingTimezone } from '@app/modules/operations/online-booking-settings/utils/resolve-booking-timezone.util';
import { randomUUID } from 'crypto';
import { PublicBookingCheckoutService } from './public-booking-checkout.service';
import { StorageService } from '@app/modules/storage/services/storage.service';
import { CreateUploadDto } from '@app/modules/storage/dto/create-upload.dto';
import { FileCategory, FileAssetStatus, FileVisibility } from '@prisma/client';

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly settingsService: OnlineBookingSettingsService,
    private readonly settingsRepository: OnlineBookingSettingsRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly availabilityService: BusinessAvailabilityService,
    private readonly publicBookingContactService: PublicBookingContactService,
    private readonly serviceRepository: ServiceRepository,
    private readonly workspaceRepository: ServiceWorkspaceRepository,
    private readonly bookingTimingService: ServiceBookingTimingService,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
    private readonly jobEnqueueService: JobEnqueueService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly checkoutService: PublicBookingCheckoutService,
    private readonly storageService: StorageService,
  ) {}

  async getBusinessBySlug(slug: string) {
    const context = await this.settingsService.resolveBusinessBySlug(slug);
    const giftCard = await this.prisma.giftCardSettings.findUnique({
      where: { businessId: context.businessId },
      select: { publicSlug: true, onlineSalesEnabled: true },
    });
    const pkg = await this.prisma.packageSettings.findUnique({
      where: { businessId: context.businessId },
      select: { publicSlug: true, onlineSalesEnabled: true },
    });
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL', '') ?? '';
    return toPublicBookingBusiness(context, {
      giftCardUrl:
        giftCard?.onlineSalesEnabled && giftCard.publicSlug && frontendUrl
          ? `${frontendUrl.replace(/\/$/, '')}/gift-cards/${giftCard.publicSlug}`
          : null,
      packageUrl:
        pkg?.onlineSalesEnabled && pkg.publicSlug && frontendUrl
          ? `${frontendUrl.replace(/\/$/, '')}/packages/${pkg.publicSlug}`
          : null,
    });
  }

  async getCatalog(
    slug: string,
    staffIdFilter?: string,
  ): Promise<PublicBookingCatalogCategoryDto[]> {
    const context = await this.settingsService.resolveBusinessBySlug(slug);
    const categories = await this.prisma.serviceCategory.findMany({
      where: { businessId: context.businessId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        services: {
          where: { deletedAt: null, status: 'ACTIVE' },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            onlineBookingSettings: true,
            staffAssignments: staffIdFilter
              ? {
                  where: {
                    userId: staffIdFilter,
                    isEnabled: true,
                    onlineBookingEnabled: true,
                  },
                }
              : true,
          },
        },
      },
    });

    const mapped = await Promise.all(
      categories.map(async (cat) => {
        const filtered = cat.services.filter((svc) => {
          const obs = svc.onlineBookingSettings;
          if (obs && !obs.onlineBookingEnabled) return false;
          if (staffIdFilter) {
            return svc.staffAssignments.some(
              (a) => a.userId === staffIdFilter && a.onlineBookingEnabled,
            );
          }
          return true;
        });

        const services = await Promise.all(
          filtered.map(async (svc) => ({
            id: svc.id,
            name: svc.name,
            description: svc.description,
            price: svc.price?.toString() ?? null,
            durationMinutes: svc.durationMinutes,
            clientOccupancyMinutes: await this.resolveClientOccupancyMinutes(
              context,
              svc.id,
              staffIdFilter,
              svc.durationMinutes,
            ),
            categoryId: cat.id,
            categoryName: cat.name,
            requireHomeAddress: Boolean(
              svc.onlineBookingSettings?.requireHomeAddress,
            ),
            paymentRequired:
              svc.onlineBookingSettings?.requirePaymentAtBooking ===
                ServicePaymentRequirement.REQUIRED ||
              Boolean(svc.onlineBookingSettings?.requireCreditCard),
          })),
        );

        return { id: cat.id, name: cat.name, services };
      }),
    );

    return mapped.filter((c) => c.services.length > 0);
  }

  async getStaffForService(
    slug: string,
    serviceId: string,
    genderFilter?: StaffGender,
  ): Promise<PublicBookingStaffDto[]> {
    const context = await this.settingsService.resolveBusinessBySlug(slug);
    await this.assertServiceBookable(context.businessId, serviceId);

    const workspace = await this.workspaceRepository.findWorkspace(
      context.businessId,
      serviceId,
    );
    if (!workspace) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const excluded = this.readExcludedStaffIds(context.anyoneExcludedStaffIds);
    let staffRows = workspace.staffAssignments.filter(
      (a) =>
        a.isEnabled && a.onlineBookingEnabled && !excluded.includes(a.userId),
    );

    if (genderFilter && context.showGenderOptions) {
      const memberships = await this.prisma.businessMembership.findMany({
        where: {
          businessId: context.businessId,
          userId: { in: staffRows.map((s) => s.userId) },
          deletedAt: null,
        },
        select: { userId: true, gender: true },
      });
      const genderByUser = new Map(
        memberships.map((m) => [m.userId, m.gender]),
      );
      staffRows = staffRows.filter((s) => {
        const g = genderByUser.get(s.userId);
        if (genderFilter === StaffGender.FEMALE)
          return g === StaffGender.FEMALE;
        if (genderFilter === StaffGender.MALE) return g === StaffGender.MALE;
        return true;
      });
    }

    const result: PublicBookingStaffDto[] = [];

    if (context.showAnyoneOption && staffRows.length > 0) {
      const anyoneDuration =
        staffRows[0].durationMinutes ?? workspace.durationMinutes;
      result.push({
        id: 'anyone',
        name: 'Anyone',
        avatarUrl: null,
        gender: null,
        price: this.resolveStaffPrice(workspace, staffRows[0]),
        durationMinutes: anyoneDuration,
        clientOccupancyMinutes: await this.resolveClientOccupancyMinutes(
          context,
          serviceId,
          undefined,
          anyoneDuration,
        ),
        availabilityLabel: this.formatAvailabilityLabel(context),
        isAnyone: true,
      });
    }

    const staffDtos = await Promise.all(
      staffRows.map(async (assignment) => {
        const user = assignment.user;
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.email ||
          'Staff';
        const durationMinutes =
          assignment.durationMinutes ?? workspace.durationMinutes;
        return {
          id: assignment.userId,
          name,
          avatarUrl: null,
          gender: null,
          price: this.resolveStaffPrice(workspace, assignment),
          durationMinutes,
          clientOccupancyMinutes: await this.resolveClientOccupancyMinutes(
            context,
            serviceId,
            assignment.userId,
            durationMinutes,
          ),
          availabilityLabel: this.formatAvailabilityLabel(context),
        };
      }),
    );

    if (context.randomizeStaffOrder) {
      this.shuffle(staffDtos);
    }

    return [...result, ...staffDtos];
  }

  async getAvailability(
    slug: string,
    query: PublicBookingAvailabilityQueryDto,
  ): Promise<PublicBookingDayAvailabilityDto[]> {
    const context = await this.settingsService.resolveBusinessBySlug(slug);
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      to < from
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid availability range',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedLines = this.normalizeAvailabilityLines(query);
    if (normalizedLines.length === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Service is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (normalizedLines.length > 1 && !context.allowMultipleServices) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Multiple services are not allowed for this business',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const line of normalizedLines) {
      await this.assertServiceBookable(context.businessId, line.serviceId);
    }

    const chain = await this.buildAvailabilityChain(
      context,
      normalizedLines,
      query,
    );

    if (chain.length === 1) {
      const line = chain[0];
      const staffSchedules = line.staffId
        ? await this.settingsRepository.findStaffSchedules(
            context.businessId,
            line.staffId,
          )
        : undefined;
      const staffExceptions = line.staffId
        ? await this.settingsRepository.findStaffExceptions(
            context.businessId,
            line.staffId,
            from,
            to,
          )
        : undefined;

      return this.availabilityService.getAvailability({
        settings: context,
        businessHours: context.business.businessHours,
        businessExceptions: context.business.businessHourExceptions,
        staffSchedules,
        staffExceptions,
        from,
        to,
        viewerTimezone: resolveBookingTimezone(
          context.timezone,
          context.business.timezone,
        ),
        staffId: line.staffId,
        eligibleStaffIds: line.eligibleStaffIds,
        timing: line.timing,
        gapPolicy: resolveGapAvoidancePolicy(context),
        allowMultipleServices: context.allowMultipleServices,
      });
    }

    return this.availabilityService.getChainedAvailability({
      settings: context,
      businessHours: context.business.businessHours,
      businessExceptions: context.business.businessHourExceptions,
      chain,
      from,
      to,
      viewerTimezone: resolveBookingTimezone(
        context.timezone,
        context.business.timezone,
      ),
      gapPolicy: resolveGapAvoidancePolicy(context),
      allowMultipleServices: context.allowMultipleServices,
    });
  }

  async findSlotsForWaitlistEntry(params: {
    businessId: string;
    serviceLines: Array<{ serviceId: string; staffId?: string | null }>;
    preferredDate: string;
  }): Promise<PublicBookingDayAvailabilityDto[]> {
    const context =
      await this.settingsRepository.findBookingContextByBusinessId(
        params.businessId,
      );
    if (!context?.onlineBookingEnabled) {
      return [];
    }

    const from = new Date(`${params.preferredDate}T00:00:00.000Z`);
    const to = new Date(`${params.preferredDate}T23:59:59.999Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return [];
    }

    const normalizedLines = params.serviceLines.map((line) => ({
      serviceId: line.serviceId,
      staffId: line.staffId ?? undefined,
      anyone: !line.staffId,
    }));

    if (normalizedLines.length === 0) {
      return [];
    }

    for (const line of normalizedLines) {
      await this.assertServiceBookable(context.businessId, line.serviceId);
    }

    const chain = await this.buildAvailabilityChain(context, normalizedLines);

    if (chain.length === 1) {
      const line = chain[0];
      const staffSchedules = line.staffId
        ? await this.settingsRepository.findStaffSchedules(
            context.businessId,
            line.staffId,
          )
        : undefined;
      const staffExceptions = line.staffId
        ? await this.settingsRepository.findStaffExceptions(
            context.businessId,
            line.staffId,
            from,
            to,
          )
        : undefined;

      return this.availabilityService.getAvailability({
        settings: context,
        businessHours: context.business.businessHours,
        businessExceptions: context.business.businessHourExceptions,
        staffSchedules,
        staffExceptions,
        from,
        to,
        viewerTimezone: resolveBookingTimezone(
          context.timezone,
          context.business.timezone,
        ),
        staffId: line.staffId,
        eligibleStaffIds: line.eligibleStaffIds,
        timing: line.timing,
        gapPolicy: resolveGapAvoidancePolicy(context),
        allowMultipleServices: context.allowMultipleServices,
      });
    }

    return this.availabilityService.getChainedAvailability({
      settings: context,
      businessHours: context.business.businessHours,
      businessExceptions: context.business.businessHourExceptions,
      chain,
      from,
      to,
      viewerTimezone: resolveBookingTimezone(
        context.timezone,
        context.business.timezone,
      ),
      gapPolicy: resolveGapAvoidancePolicy(context),
      allowMultipleServices: context.allowMultipleServices,
    });
  }

  async createBooking(
    slug: string,
    dto: CreatePublicBookingDto,
    context?: { userAgent?: string; isEmbed?: boolean },
  ): Promise<PublicBookingConfirmationDto> {
    const bookingContext =
      await this.settingsService.resolveBusinessBySlug(slug);
    const schedulingTimezone = this.resolveSchedulingTimezone(bookingContext);

    const normalizedLines = this.normalizeBookingLines(dto);
    if (normalizedLines.length === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Service is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.validateServiceLinesRules(normalizedLines, bookingContext);

    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid appointment time',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const line of normalizedLines) {
      await this.assertServiceBookable(bookingContext.businessId, line.serviceId);
    }

    const chain = await this.buildAvailabilityChain(
      bookingContext,
      normalizedLines.map((line) => ({
        serviceId: line.serviceId,
        staffId: line.staffId,
        anyone: line.anyone,
      })),
    );

    const resolvedChain = await this.availabilityService.isChainedSlotAvailable({
      settings: bookingContext,
      businessHours: bookingContext.business.businessHours,
      businessExceptions: bookingContext.business.businessHourExceptions,
      chain,
      startAt,
      gapPolicy: resolveGapAvoidancePolicy(bookingContext),
      allowMultipleServices: bookingContext.allowMultipleServices,
    });

    if (!resolvedChain) {
      throw new AppException(
        ErrorCode.BOOKING_SLOT_UNAVAILABLE,
        'This time slot is no longer available',
        HttpStatus.CONFLICT,
      );
    }

    const builtLines = await this.buildPublicServiceLines(
      bookingContext.businessId,
      resolvedChain,
    );
    const endAt = builtLines.endAt;
    const primaryServiceId = builtLines.serviceLines[0]?.serviceId ?? null;
    const assignedStaffId = builtLines.serviceLines[0]?.assignedToId ?? null;

    const formSettings = toPublicBookingBusiness(bookingContext).formSettings;
    const serviceOnlineSettings =
      await this.workspaceRepository.findOnlineBookingSettings(
        bookingContext.businessId,
        primaryServiceId!,
      );
    this.validateBookingForm(
      dto,
      formSettings,
      bookingContext,
      serviceOnlineSettings,
    );

    const paymentRequired = await this.anyServiceRequiresPayment(
      bookingContext.businessId,
      normalizedLines.map((line) => line.serviceId),
    );
    if (paymentRequired) {
      if (!dto.paymentIntentId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Payment is required to complete this booking',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.checkoutService.verifyPaymentIntent(
        bookingContext.businessId,
        dto.paymentIntentId,
        { serviceId: primaryServiceId!, holdToken: dto.holdToken },
      );
    }

    if (dto.holdToken) {
      await this.checkoutService.assertHoldValid(dto.holdToken, {
        businessId: bookingContext.businessId,
        serviceId: primaryServiceId!,
        staffId: assignedStaffId,
        startAt: dto.startAt,
        endAt: endAt.toISOString(),
        timezone: schedulingTimezone,
      });
    }

    const serviceRecords = await Promise.all(
      builtLines.serviceLines.map((line) =>
        this.serviceRepository.findById(bookingContext.businessId, line.serviceId),
      ),
    );
    const primaryService = serviceRecords[0];
    const serviceName =
      builtLines.serviceLines.length > 1
        ? builtLines.serviceLines
            .map((line, index) => serviceRecords[index]?.name ?? 'Service')
            .join(' + ')
        : (primaryService?.name ?? 'Appointment');

    const contactSource = context?.isEmbed
      ? 'Calendar Widget'
      : 'Public Booking';

    const contact = await this.publicBookingContactService.resolveOrCreate(
      bookingContext.businessId,
      {
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        phoneCountryCode: dto.phoneCountryCode,
        phoneNumber: dto.phoneNumber,
        formAnswers: dto.formAnswers,
        source: contactSource,
      },
    );

    const source =
      dto.source ??
      (context?.isEmbed
        ? AppointmentSource.BOOKING_WIDGET
        : AppointmentSource.PUBLIC_LINK);

    const status = bookingContext.requireApproval
      ? AppointmentStatus.UNCONFIRMED
      : bookingContext.autoConfirm
        ? AppointmentStatus.CONFIRMED
        : AppointmentStatus.UNCONFIRMED;

    const title = `${dto.customerName.trim()} - ${serviceName}`;

    const staffUsers = await this.prisma.user.findMany({
      where: {
        id: {
          in: builtLines.serviceLines
            .map((line) => line.assignedToId)
            .filter((id): id is string => Boolean(id)),
        },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const staffNameById = new Map(
      staffUsers.map((user) => [
        user.id,
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.email ||
          'Staff',
      ]),
    );
    const primaryStaffName = assignedStaffId
      ? (staffNameById.get(assignedStaffId) ?? null)
      : null;

    const primaryTiming = await this.resolveTiming(
      bookingContext,
      primaryServiceId!,
      assignedStaffId ?? undefined,
    );
    const serviceMetadata = primaryTiming
      ? this.bookingTimingService.buildAppointmentMetadata({
          timing: primaryTiming,
          service: primaryService!,
          productUsageIds: [],
          secondaryStaffId: dto.secondaryStaffId ?? null,
        })
      : null;

    const uploadToken = bookingContext.collectPhotosEnabled
      ? randomUUID()
      : null;

    const appointment = await this.appointmentRepository.create(
      bookingContext.businessId,
      {
        calendarId: null,
        contactId: contact.id,
        serviceId: primaryServiceId,
        assignedToId: assignedStaffId,
        title,
        startAt,
        endAt,
        status,
        source,
        locationType: bookingContext.locationType,
        locationValue: bookingContext.locationValue,
        notes: dto.notes?.trim() || null,
        metadata: {
          publicSlug: slug,
          formAnswers: dto.formAnswers ?? null,
          customerTimezone: schedulingTimezone,
          userAgent: context?.userAgent ?? null,
          referrer: dto.referrer ?? null,
          offerCode: dto.offerCode?.trim().toUpperCase() || null,
          bookedForFirstName: dto.bookedForFirstName ?? null,
          bookedForLastName: dto.bookedForLastName ?? null,
          bookedForEmail: dto.bookedForEmail?.trim().toLowerCase() ?? null,
          homeAddress: dto.homeAddress ?? null,
          reminderOptIn: dto.reminderOptIn ?? null,
          policyAgreed: dto.policyAgreed ?? null,
          uploadToken,
          paymentIntentId: dto.paymentIntentId ?? null,
          ...(serviceMetadata ?? {}),
        } as Prisma.InputJsonValue,
      },
    );

    for (const line of builtLines.serviceLines) {
      await this.prisma.appointmentServiceLine.create({
        data: {
          appointmentId: appointment.id,
          serviceId: line.serviceId,
          assignedToId: line.assignedToId,
          startAt: line.startAt,
          durationMinutes: line.durationMinutes,
          price: line.price,
          sortOrder: line.sortOrder,
        },
      });
    }

    const confirmationLines = builtLines.serviceLines.map((line, index) => ({
      serviceId: line.serviceId,
      serviceName: serviceRecords[index]?.name ?? 'Service',
      staffId: line.assignedToId,
      staffName: line.assignedToId
        ? (staffNameById.get(line.assignedToId) ?? null)
        : null,
      startAt: line.startAt!,
      endAt: new Date(line.startAt!.getTime() + line.durationMinutes! * 60_000),
      price: line.price?.toString() ?? null,
    }));

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: bookingContext.businessId,
      action: 'appointment.public_booked',
      entityType: 'Appointment',
      entityId: appointment.id,
      metadata: { source, publicSlug: slug },
    });

    await this.sendBookingEmails(
      bookingContext,
      appointment,
      dto,
      contact.id,
      serviceName,
    );

    await this.checkoutService.releaseHold(dto.holdToken);

    void this.jobEnqueueService
      .enqueueAppointmentGoogleSync({
        businessId: bookingContext.businessId,
        appointmentId: appointment.id,
        actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      })
      .catch((err) => {
        this.logger.warn(
          `Google sync enqueue failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return toPublicBookingConfirmation({
      appointmentId: appointment.id,
      title: appointment.title,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      timezone: schedulingTimezone,
      status: appointment.status,
      businessName: bookingContext.business.name,
      serviceName,
      staffName: primaryStaffName,
      serviceLines: confirmationLines,
      context: bookingContext,
      uploadToken,
    });
  }

  async createPhotoUpload(slug: string, dto: PublicBookingPhotoUploadDto) {
    const { context, appointment, metadata } =
      await this.requirePhotoUploadAccess(slug, dto.appointmentId, dto.uploadToken);

    const existing = Array.isArray(metadata.photoFileIds)
      ? (metadata.photoFileIds as string[])
      : [];
    if (existing.length >= 3) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Maximum of 3 photos already attached',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!dto.mimeType.startsWith('image/')) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Only image uploads are allowed',
        HttpStatus.BAD_REQUEST,
      );
    }

    const uploadDto: CreateUploadDto = {
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: dto.size,
      category: FileCategory.IMAGE,
      visibility: FileVisibility.PRIVATE,
    };

    return this.storageService.createBusinessUpload(
      context.businessId,
      uploadDto,
      { auditActorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL },
    );
  }

  async confirmPhotoUpload(
    slug: string,
    fileAssetId: string,
    dto: PublicBookingPhotoConfirmDto,
  ) {
    const { context } = await this.requirePhotoUploadAccess(
      slug,
      dto.appointmentId,
      dto.uploadToken,
    );
    return this.storageService.confirmBusinessUpload(
      context.businessId,
      fileAssetId,
      SYSTEM_AUDIT_ACTOR_SENTINEL,
    );
  }

  async failPhotoUpload(
    slug: string,
    fileAssetId: string,
    dto: PublicBookingPhotoFailDto,
  ) {
    const { context } = await this.requirePhotoUploadAccess(
      slug,
      dto.appointmentId,
      dto.uploadToken,
    );
    return this.storageService.failBusinessUpload(
      context.businessId,
      fileAssetId,
      dto.reason?.trim() || 'Upload aborted by client',
      SYSTEM_AUDIT_ACTOR_SENTINEL,
    );
  }

  async attachPhotos(slug: string, dto: PublicBookingAttachPhotosDto) {
    const { appointment, metadata } = await this.requirePhotoUploadAccess(
      slug,
      dto.appointmentId,
      dto.uploadToken,
    );

    const existing = Array.isArray(metadata.photoFileIds)
      ? (metadata.photoFileIds as string[])
      : [];
    const uniqueIncoming = [...new Set(dto.fileIds)];
    if (existing.length + uniqueIncoming.length > 3) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        `You can attach up to 3 photos (${existing.length} already attached)`,
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const fileId of uniqueIncoming) {
      const file = await this.storageService.getFile(
        appointment.businessId,
        fileId,
      );
      if (file.status !== FileAssetStatus.READY) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'All photos must be fully uploaded before attaching',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (file.category !== FileCategory.IMAGE) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'Only image uploads can be attached',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const merged = [...existing, ...uniqueIncoming];

    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        metadata: {
          ...metadata,
          photoFileIds: merged,
        },
      },
    });

    return { photoFileIds: merged };
  }

  private async requirePhotoUploadAccess(
    slug: string,
    appointmentId: string,
    uploadToken: string,
  ) {
    const context = await this.settingsService.resolveBusinessBySlug(slug);
    if (!context.collectPhotosEnabled) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Photo upload is not enabled',
        HttpStatus.BAD_REQUEST,
      );
    }

    const appointment = await this.appointmentRepository.findById(
      context.businessId,
      appointmentId,
    );
    if (!appointment) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const metadata = (appointment.metadata ?? {}) as Record<string, unknown>;
    if (metadata.uploadToken !== uploadToken) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Invalid upload token',
        HttpStatus.FORBIDDEN,
      );
    }

    return { context, appointment, metadata };
  }

  /** @deprecated Calendar-slug endpoints */
  async getCalendarBySlug(slug: string) {
    return this.getBusinessBySlug(slug);
  }

  private normalizeAvailabilityLines(
    query: PublicBookingAvailabilityQueryDto,
  ): Array<{ serviceId: string; staffId?: string; anyone?: boolean }> {
    const parsed = normalizeServiceLinesValue(query.serviceLines);
    if (parsed?.length) {
      return parsed.map((line) => ({
        serviceId: line.serviceId,
        staffId: line.staffId,
        anyone: !line.staffId,
      }));
    }
    if (query.serviceId) {
      return [
        {
          serviceId: query.serviceId,
          staffId: query.staffId,
          anyone: query.anyone,
        },
      ];
    }
    return [];
  }

  private normalizeBookingLines(dto: CreatePublicBookingDto): Array<{
    serviceId: string;
    staffId?: string;
    anyone?: boolean;
  }> {
    if (dto.serviceLines?.length) {
      return dto.serviceLines.map((line) => ({
        serviceId: line.serviceId,
        staffId: line.staffId,
        anyone: !line.staffId,
      }));
    }
    if (dto.serviceId) {
      return [
        {
          serviceId: dto.serviceId,
          staffId: dto.staffId,
          anyone: dto.anyone,
        },
      ];
    }
    return [];
  }

  private validateServiceLinesRules(
    lines: Array<{ serviceId: string; staffId?: string }>,
    context: BusinessBookingContext,
  ) {
    if (lines.length > 1 && !context.allowMultipleServices) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Multiple services are not allowed for this business',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!context.allowDuplicateServices) {
      const serviceIds = lines.map((line) => line.serviceId);
      if (new Set(serviceIds).size !== serviceIds.length) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Duplicate services are not allowed in the same booking',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (context.singleStaffOnly && lines.length > 1) {
      const staffIds = lines
        .map((line) => line.staffId)
        .filter((id): id is string => Boolean(id && id !== 'anyone'));
      if (staffIds.length > 0 && new Set(staffIds).size > 1) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'All services must use the same staff member',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private async buildAvailabilityChain(
    context: BusinessBookingContext,
    lines: Array<{ serviceId: string; staffId?: string; anyone?: boolean }>,
    query?: PublicBookingAvailabilityQueryDto,
  ) {
    const chain = [];
    for (const line of lines) {
      const isAnyone = line.anyone || !line.staffId || line.staffId === 'anyone';
      const staffId = isAnyone ? undefined : line.staffId;
      const timing = await this.resolveTiming(context, line.serviceId, staffId);
      const eligibleStaffIds = isAnyone
        ? await this.resolveEligibleStaffIds(
            context,
            line.serviceId,
            undefined,
            true,
            query?.genderFilter,
          )
        : undefined;

      const staffSchedules = staffId
        ? await this.settingsRepository.findStaffSchedules(
            context.businessId,
            staffId,
          )
        : undefined;
      const weeklyHours = resolveEffectiveWeeklyHours(
        context.business.businessHours,
        staffSchedules?.length ? staffSchedules : undefined,
      );

      chain.push({
        serviceId: line.serviceId,
        staffId,
        anyone: isAnyone,
        eligibleStaffIds,
        timing,
        weeklyHours,
      });
    }
    return chain;
  }

  private async buildPublicServiceLines(
    businessId: string,
    resolvedChain: Array<{
      serviceId: string;
      staffId: string;
      startAt: Date;
      endAt: Date;
      clientOccupancyMinutes: number;
    }>,
  ) {
    const serviceLines: Array<{
      serviceId: string;
      assignedToId: string;
      startAt: Date;
      durationMinutes: number;
      price: Prisma.Decimal | null;
      sortOrder: number;
    }> = [];

    for (let i = 0; i < resolvedChain.length; i++) {
      const segment = resolvedChain[i];
      const service = await this.serviceRepository.findById(
        businessId,
        segment.serviceId,
      );
      if (!service) {
        throw new AppException(
          ErrorCode.SERVICE_NOT_FOUND,
          'Service not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      serviceLines.push({
        serviceId: segment.serviceId,
        assignedToId: segment.staffId,
        startAt: segment.startAt,
        durationMinutes: segment.clientOccupancyMinutes,
        price: service.price,
        sortOrder: i,
      });
    }

    const endAt =
      resolvedChain.length > 0
        ? resolvedChain[resolvedChain.length - 1].endAt
        : new Date();

    return { serviceLines, endAt };
  }

  private async anyServiceRequiresPayment(
    businessId: string,
    serviceIds: string[],
  ): Promise<boolean> {
    for (const serviceId of serviceIds) {
      const settings = await this.workspaceRepository.findOnlineBookingSettings(
        businessId,
        serviceId,
      );
      if (
        settings?.requirePaymentAtBooking === ServicePaymentRequirement.REQUIRED ||
        settings?.requireCreditCard
      ) {
        return true;
      }
    }
    return false;
  }

  private async assignAnyoneStaff(
    context: BusinessBookingContext,
    serviceId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<string> {
    const eligible = await this.resolveEligibleStaffIds(
      context,
      serviceId,
      undefined,
      true,
    );
    const excluded = this.readExcludedStaffIds(context.anyoneExcludedStaffIds);
    const candidates = eligible.filter((id) => !excluded.includes(id));

    const free: string[] = [];
    for (const staffId of candidates) {
      const schedules = await this.settingsRepository.findStaffSchedules(
        context.businessId,
        staffId,
      );
      const timing = await this.resolveTiming(context, serviceId, staffId);
      const ok = await this.availabilityService.isSlotAvailable({
        settings: context,
        businessHours: context.business.businessHours,
        businessExceptions: context.business.businessHourExceptions,
        staffSchedules: schedules,
        startAt,
        endAt,
        staffId,
        timing,
        gapPolicy: resolveGapAvoidancePolicy(context),
        allowMultipleServices: context.allowMultipleServices,
      });
      if (ok) free.push(staffId);
    }

    if (free.length === 0) {
      throw new AppException(
        ErrorCode.BOOKING_SLOT_UNAVAILABLE,
        'No staff available at this time',
        HttpStatus.CONFLICT,
      );
    }

    if (context.anyoneAssignmentMode === AnyoneAssignmentMode.RANDOM) {
      return free[Math.floor(Math.random() * free.length)];
    }
    return free[0];
  }

  private async buildConflictAlternatives(
    slug: string,
    serviceId: string,
    staffId: string | undefined,
    failedStart: Date,
    timezone: string,
  ) {
    const staff = staffId ? [] : await this.getStaffForService(slug, serviceId);
    const from = failedStart;
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    const days = await this.getAvailability(slug, {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone,
      serviceId,
      staffId,
      anyone: !staffId,
    });
    const slots = days.flatMap((d) => d.slots).slice(0, 6);
    return { alternativeStaff: staff.slice(0, 5), alternativeSlots: slots };
  }

  private async assertServiceBookable(businessId: string, serviceId: string) {
    const settings = await this.workspaceRepository.findOnlineBookingSettings(
      businessId,
      serviceId,
    );
    if (settings && !settings.onlineBookingEnabled) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This service is not available for online booking',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async resolveEligibleStaffIds(
    context: BusinessBookingContext,
    serviceId: string,
    staffId?: string,
    anyone?: boolean,
    genderFilter?: StaffGender,
  ): Promise<string[]> {
    if (staffId && staffId !== 'anyone') return [staffId];
    const workspace = await this.workspaceRepository.findWorkspace(
      context.businessId,
      serviceId,
    );
    if (!workspace) return [];
    let rows = workspace.staffAssignments.filter(
      (a) => a.isEnabled && a.onlineBookingEnabled,
    );
    const excluded = this.readExcludedStaffIds(context.anyoneExcludedStaffIds);
    rows = rows.filter((a) => !excluded.includes(a.userId));

    if (genderFilter && context.showGenderOptions) {
      const memberships = await this.prisma.businessMembership.findMany({
        where: {
          businessId: context.businessId,
          userId: { in: rows.map((r) => r.userId) },
        },
        select: { userId: true, gender: true },
      });
      rows = rows.filter((r) => {
        const g = memberships.find((m) => m.userId === r.userId)?.gender;
        if (genderFilter === StaffGender.FEMALE)
          return g === StaffGender.FEMALE;
        if (genderFilter === StaffGender.MALE) return g === StaffGender.MALE;
        return true;
      });
    }

    return anyone || context.showAnyoneOption
      ? rows.map((r) => r.userId)
      : rows.map((r) => r.userId);
  }

  private async resolveTiming(
    context: BusinessBookingContext,
    serviceId: string,
    staffId?: string,
  ) {
    return this.bookingTimingService.resolveForBooking({
      businessId: context.businessId,
      serviceId,
      staffId,
      calendar: {
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        defaultDurationMinutes: 30,
      } as never,
    });
  }

  private async resolveClientOccupancyMinutes(
    context: BusinessBookingContext,
    serviceId: string,
    staffId: string | undefined,
    fallbackMinutes: number,
  ): Promise<number> {
    const timing = await this.bookingTimingService.resolveForBooking({
      businessId: context.businessId,
      serviceId,
      staffId,
      calendar: {
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        defaultDurationMinutes: fallbackMinutes,
      } as never,
    });
    return timing?.clientOccupancyMinutes ?? fallbackMinutes;
  }

  private resolveStaffPrice(
    workspace: { price: Prisma.Decimal | null },
    assignment: { price: Prisma.Decimal | null },
  ): string | null {
    const price = assignment.price ?? workspace.price;
    return price?.toString() ?? null;
  }

  private formatAvailabilityLabel(context: BusinessBookingContext): string {
    const enabled = context.business.businessHours.filter((h) => h.isEnabled);
    if (enabled.length === 0) return 'MON-SUN';
    return 'MON-SUN';
  }

  private readExcludedStaffIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string');
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private validateBookingForm(
    dto: CreatePublicBookingDto,
    formSettings: ReturnType<typeof toPublicBookingBusiness>['formSettings'],
    context: BusinessBookingContext,
    serviceOnlineSettings?: Awaited<
      ReturnType<ServiceWorkspaceRepository['findOnlineBookingSettings']>
    >,
  ) {
    if (formSettings.requireEmail && !dto.customerEmail?.trim()) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Email is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      formSettings.requirePhone &&
      (!dto.phoneNumber?.trim() || !dto.phoneCountryCode?.trim())
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Phone number is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (formSettings.requirePolicyAgreement && !dto.policyAgreed) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'You must agree to the cancellation policy',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      !formSettings.showBookForSomeoneElse &&
      (dto.bookedForFirstName || dto.bookedForLastName || dto.bookedForEmail)
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Booking for someone else is not enabled',
        HttpStatus.BAD_REQUEST,
      );
    }
    const bookingForSomeoneElse = Boolean(
      dto.bookedForFirstName?.trim() ||
      dto.bookedForLastName?.trim() ||
      dto.bookedForEmail?.trim(),
    );
    if (bookingForSomeoneElse && !dto.bookedForEmail?.trim()) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Email is required when booking for someone else',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (serviceOnlineSettings?.requireHomeAddress && !dto.homeAddress?.trim()) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Home address is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    void context;
  }

  private resolveSchedulingTimezone(context: BusinessBookingContext): string {
    return resolveBookingTimezone(context.timezone, context.business.timezone);
  }

  private async sendBookingEmails(
    context: BusinessBookingContext,
    appointment: { id: string; startAt: Date; endAt: Date; title: string },
    dto: CreatePublicBookingDto,
    contactId: string,
    serviceName: string,
  ) {
    const schedulingTimezone = this.resolveSchedulingTimezone(context);
    const startAtFormatted = formatAppointmentDateTime(
      appointment.startAt,
      schedulingTimezone,
    );
    const contactName = formatContactName({
      displayName: dto.customerName,
      email: dto.customerEmail,
    });
    const bookingVariables = {
      'business.name': context.business.name,
      'contact.name': contactName,
      'contact.email': dto.customerEmail?.trim() ?? '',
      'appointment.start_at': startAtFormatted,
      'appointment.end_at': formatAppointmentDateTime(
        appointment.endAt,
        schedulingTimezone,
      ),
      'appointment.calendar_name': serviceName,
      'appointment.title': appointment.title,
    };

    if (dto.customerEmail?.trim()) {
      void this.emailNotificationService
        .enqueueTransactionalEmail({
          businessId: context.businessId,
          emailType: 'appointment.confirmation',
          toEmail: dto.customerEmail.trim(),
          contactId,
          entityType: 'Appointment',
          entityId: appointment.id,
          fromName: context.business.name,
          idempotencyKey: `booking-confirm-${appointment.id}`,
          variables: bookingVariables,
        })
        .catch(() => undefined);
    }

    const bookedForEmail = dto.bookedForEmail?.trim();
    if (bookedForEmail) {
      const bookedForName =
        [dto.bookedForFirstName?.trim(), dto.bookedForLastName?.trim()]
          .filter(Boolean)
          .join(' ') || bookedForEmail;
      void this.emailNotificationService
        .enqueueTransactionalEmail({
          businessId: context.businessId,
          emailType: 'appointment.booked_for',
          toEmail: bookedForEmail,
          entityType: 'Appointment',
          entityId: appointment.id,
          fromName: context.business.name,
          idempotencyKey: `booking-booked-for-${appointment.id}`,
          variables: {
            'business.name': context.business.name,
            'booked_for.name': bookedForName,
            'booked_for.email': bookedForEmail,
            'booked_by.name': contactName,
            'booked_by.email': dto.customerEmail?.trim() ?? '',
            'appointment.start_at': startAtFormatted,
            'appointment.end_at': formatAppointmentDateTime(
              appointment.endAt,
              schedulingTimezone,
            ),
            'appointment.calendar_name': serviceName,
            'appointment.title': appointment.title,
          },
        })
        .catch(() => undefined);
    }

    void this.membershipRepository
      .findOwnersAndAdmins(context.businessId)
      .then((members) => {
        for (const member of members) {
          if (!member.user.email) continue;
          void this.emailNotificationService
            .enqueueTransactionalEmail({
              businessId: context.businessId,
              emailType: 'appointment.owner_notification',
              toEmail: member.user.email,
              userId: member.userId,
              entityType: 'Appointment',
              entityId: appointment.id,
              fromName: context.business.name,
              idempotencyKey: `booking-owner-${appointment.id}-${member.userId}`,
              variables: bookingVariables,
            })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }
}
