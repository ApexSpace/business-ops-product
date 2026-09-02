import {
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppointmentSource,
  AppointmentStatus,
  NotificationChannel,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { formatAppointmentDateTime } from '@app/modules/communications/email/utils/email-variables.util';
import { APPOINTMENT_EXPRESS_COMPLETE_KEY } from '@app/modules/communications/notifications/constants/notification-channel.constants';
import { NotificationChannelPreferenceService } from '@app/modules/communications/notifications/services/notification-channel-preference.service';
import { NotificationDispatchService } from '@app/modules/communications/notifications/services/notification-dispatch.service';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { ServiceWorkspaceRepository } from '@app/modules/crm/services/repositories/service-workspace.repository';
import { resolveServiceTiming } from '@app/modules/crm/services/utils/service-timing.util';
import { formatPhone } from '@app/modules/crm/contacts/utils/contact-profile.util';
import {
  AppointmentRepository,
  type AppointmentWithRelations,
} from '@app/modules/operations/appointments/repositories/appointment.repository';
import { generateClientManageToken } from '@app/modules/operations/appointments/utils/appointment-manage-token.util';
import { toAppointmentResponse } from '@app/modules/operations/appointments/mappers/appointment.mapper';
import type { AppointmentResponseDto } from '@app/modules/operations/appointments/dto/appointment.dto';
import {
  appointmentBlocksOverlap,
  resolveAppointmentBlockingWindow,
} from '@app/modules/operations/appointments/utils/appointment-blocking.util';
import { OnlineBookingSettingsRepository } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import { resolveBookingTimezone } from '@app/modules/operations/online-booking-settings/utils/resolve-booking-timezone.util';
import { PublicBookingContactService } from '@app/modules/operations/public-booking/services/public-booking-contact.service';
import { BookingDepositPaymentService } from '@app/modules/finance/payments/services/booking-deposit-payment.service';
import { BookingLinkSaleService } from '@app/modules/finance/payments/services/booking-link-sale.service';
import { StripeContactPaymentMethodService } from '@app/modules/finance/payments/services/stripe-contact-payment-method.service';
import { CancelRescheduleSettingsRepository } from '@app/modules/operations/appointments/cancel-reschedule-settings/repositories/cancel-reschedule-settings.repository';
import { resolveExpressDeposit } from '../utils/express-deposit.util';
import type { BusinessOnlineBookingSettings } from '@prisma/client';
import { stripHtmlToPlainText } from '@app/modules/operations/appointments/cancel-reschedule-settings/utils/cancel-reschedule-behavior.util';
import { AppointmentNotificationService } from '@app/modules/operations/appointments/services/appointment-notification.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import {
  CreateExpressAppointmentDto,
  ExpressCheckoutDto,
  ExpressCompleteDto,
} from '../dto/express-booking.dto';

function readFormSettings(
  formSettings: unknown,
  policy?: {
    cancellationPolicyHtml?: string | null;
    requirePolicyAgreement?: boolean;
  },
) {
  const fs =
    formSettings &&
    typeof formSettings === 'object' &&
    !Array.isArray(formSettings)
      ? (formSettings as Record<string, unknown>)
      : {};
  const policyHtml =
    policy?.cancellationPolicyHtml ??
    (typeof fs.cancellationPolicyText === 'string'
      ? fs.cancellationPolicyText
      : null);
  return {
    requireEmail: fs.requireEmail !== false,
    requirePhone: Boolean(fs.requirePhone),
    showNotes: fs.showNotes !== false,
    cancellationPolicyText: stripHtmlToPlainText(policyHtml) || null,
    requirePolicyAgreement:
      policy?.requirePolicyAgreement ?? Boolean(fs.requirePolicyAgreement),
  };
}

@Injectable()
export class ExpressBookingService {
  private readonly logger = new Logger(ExpressBookingService.name);

  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly settingsRepository: OnlineBookingSettingsRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly workspaceRepository: ServiceWorkspaceRepository,
    private readonly publicBookingContactService: PublicBookingContactService,
    private readonly bookingDepositPayment: BookingDepositPaymentService,
    private readonly bookingLinkSale: BookingLinkSaleService,
    private readonly stripeContactPaymentMethod: StripeContactPaymentMethodService,
    private readonly prisma: PrismaService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly businessRepository: BusinessRepository,
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly notificationChannelPreference: NotificationChannelPreferenceService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly cancelRescheduleSettingsRepository: CancelRescheduleSettingsRepository,
  ) {}

  async create(
    businessId: string,
    dto: CreateExpressAppointmentDto,
    actor: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const settings = await this.settingsRepository.ensureSettings(businessId);
    if (!settings.expressBookingEnabled) {
      throw new AppException(
        ErrorCode.EXPRESS_BOOKING_DISABLED,
        'Express Booking is not enabled for this business',
        HttpStatus.BAD_REQUEST,
      );
    }

    const channel = await this.notificationChannelPreference.getChannel(
      businessId,
      APPOINTMENT_EXPRESS_COMPLETE_KEY,
    );

    const hasContact = Boolean(dto.contactId);
    const hasGuestName = Boolean(dto.guestFirstName?.trim());
    const hasGuestDestination =
      channel === NotificationChannel.SMS
        ? Boolean(dto.guestPhone?.trim())
        : Boolean(dto.guestEmail?.trim());
    const hasGuest = hasGuestName && hasGuestDestination;
    if (hasContact === hasGuest) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        channel === NotificationChannel.SMS
          ? 'Provide either an existing contact or guest first name and phone'
          : 'Provide either an existing contact or guest first name and email',
        HttpStatus.BAD_REQUEST,
      );
    }

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

    await this.assertStaffForService(
      businessId,
      dto.serviceId,
      dto.assignedToId,
    );

    const timing = resolveServiceTiming({
      durationMinutes: service.durationMinutes,
      hasProcessingTime: service.hasProcessingTime,
      processingDurationMinutes: service.processingDurationMinutes,
      finishDurationMinutes: service.finishDurationMinutes,
      hasBufferTime: service.hasBufferTime,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
    });

    const startAt = new Date(dto.startAt);
    const endAt = dto.endAt
      ? new Date(dto.endAt)
      : new Date(startAt.getTime() + timing.clientOccupancyMinutes * 60_000);

    if (!(endAt.getTime() > startAt.getTime())) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'endAt must be after startAt',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.assertStaffSlotAvailable({
      businessId,
      staffId: dto.assignedToId,
      startAt,
      endAt,
      bufferBeforeMinutes: timing.bufferBeforeMinutes,
      bufferAfterMinutes: timing.bufferAfterMinutes,
    });

    let contactId: string | null = null;
    let guestFirstName = '';
    let guestEmail: string | null = null;
    let guestPhone: string | null = null;
    let guestPhoneCountryCode: string | null = null;

    if (dto.contactId) {
      const contact = await this.contactRepository.findById(
        businessId,
        dto.contactId,
      );
      if (!contact) {
        throw new AppException(
          ErrorCode.CONTACT_NOT_FOUND,
          'Contact not found',
          HttpStatus.NOT_FOUND,
        );
      }
      const contactEmail = contact.email?.trim().toLowerCase() || '';
      guestPhone = contact.phoneNumber?.trim() || null;
      guestPhoneCountryCode = contact.phoneCountryCode?.trim() || null;

      if (channel === NotificationChannel.SMS) {
        const toPhone = formatPhone(guestPhoneCountryCode, guestPhone);
        if (!toPhone) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Contact must have a phone number to send the Express Booking link by SMS',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (!contactEmail) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Contact must have an email to send the Express Booking link',
          HttpStatus.BAD_REQUEST,
        );
      }

      contactId = contact.id;
      guestFirstName =
        contact.firstName?.trim() ||
        contact.displayName?.trim() ||
        'Guest';
      guestEmail = contactEmail || null;
    } else {
      guestFirstName = dto.guestFirstName!.trim();
      guestEmail = dto.guestEmail?.trim().toLowerCase() || null;
      guestPhone = dto.guestPhone?.trim() || null;
      guestPhoneCountryCode = dto.guestPhoneCountryCode?.trim() || null;

      if (channel === NotificationChannel.SMS) {
        const toPhone = formatPhone(guestPhoneCountryCode, guestPhone);
        if (!toPhone) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Guest phone is required to send the Express Booking link by SMS',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (!guestEmail) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Guest email is required to send the Express Booking link',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const token = randomUUID();
    const timeLimitMinutes =
      dto.expressTimeLimitMinutes ??
      settings.expressBookingTimeLimitMinutes ??
      30;
    const expiresAt = new Date(Date.now() + timeLimitMinutes * 60_000);
    const title = `${guestFirstName} — ${service.name}`;

    const appointment = await this.appointmentRepository.create(
      businessId,
      {
        calendarId: dto.calendarId ?? null,
        contactId,
        serviceId: service.id,
        assignedToId: dto.assignedToId,
        title,
        startAt,
        endAt,
        status: AppointmentStatus.PENDING_COMPLETION,
        source: AppointmentSource.EXPRESS,
        guestFirstName,
        guestEmail,
        guestPhone,
        guestPhoneCountryCode,
        expressBookingToken: token,
        expressBookingExpiresAt: expiresAt,
        expressRequireCard: dto.expressRequireCard ?? null,
        expressRequireDeposit: dto.expressRequireDeposit ?? null,
        expressTimeLimitMinutes: dto.expressTimeLimitMinutes ?? null,
        createdById: actor.id,
      },
      [
        {
          serviceId: service.id,
          assignedToId: dto.assignedToId,
          startAt,
          durationMinutes: timing.clientOccupancyMinutes,
          price: service.price ?? undefined,
          sortOrder: 0,
        },
      ],
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.express_created',
      entityType: 'Appointment',
      entityId: appointment.id,
    });

    await this.sendCompletionLink(businessId, appointment.id);

    return toAppointmentResponse(appointment);
  }

  /**
   * Staff finishes Express Booking without the client link (phone-call override).
   */
  async staffComplete(
    businessId: string,
    appointmentId: string,
    actor: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const existing = await this.appointmentRepository.findById(
      businessId,
      appointmentId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (existing.status !== AppointmentStatus.PENDING_COMPLETION) {
      throw new AppException(
        ErrorCode.EXPRESS_BOOKING_INVALID,
        'Only pending Express Bookings can be completed by staff',
        HttpStatus.BAD_REQUEST,
      );
    }

    const settings = await this.settingsRepository.ensureSettings(businessId);

    let contactId = existing.contactId;
    if (!contactId) {
      const name =
        existing.guestFirstName?.trim() ||
        existing.title.split('—')[0]?.trim() ||
        'Guest';
      const email = existing.guestEmail?.trim();
      if (!email) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Add a client email before completing this Express Booking',
          HttpStatus.BAD_REQUEST,
        );
      }
      const contact = await this.publicBookingContactService.resolveOrCreate(
        businessId,
        {
          customerName: name,
          customerEmail: email,
          phoneCountryCode: existing.guestPhoneCountryCode ?? undefined,
          phoneNumber: existing.guestPhone ?? undefined,
          source: 'Express Booking',
        },
      );
      contactId = contact.id;
    }

    const previousMetadata =
      existing.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {};

    const updated = await this.appointmentRepository.update(existing.id, {
      contact: { connect: { id: contactId } },
      status: this.resolveCompletionStatus(settings),
      expressBookingToken: null,
      expressBookingExpiresAt: null,
      expressBookingCompletedAt: new Date(),
      guestFirstName: null,
      guestEmail: null,
      guestPhone: null,
      guestPhoneCountryCode: null,
      ...(existing.clientManageToken
        ? {}
        : { clientManageToken: generateClientManageToken() }),
      metadata: {
        ...previousMetadata,
        expressCompletedByStaff: true,
        expressCompleted: true,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.express_staff_completed',
      entityType: 'Appointment',
      entityId: updated.id,
    });

    return toAppointmentResponse(updated);
  }

  async resend(
    businessId: string,
    appointmentId: string,
    actor: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const existing = await this.appointmentRepository.findById(
      businessId,
      appointmentId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (existing.status !== AppointmentStatus.PENDING_COMPLETION) {
      throw new AppException(
        ErrorCode.EXPRESS_BOOKING_INVALID,
        'Only pending Express Bookings can be resent',
        HttpStatus.BAD_REQUEST,
      );
    }

    const settings = await this.settingsRepository.ensureSettings(businessId);
    const timeLimitMinutes =
      existing.expressTimeLimitMinutes ??
      settings.expressBookingTimeLimitMinutes ??
      30;
    const token = existing.expressBookingToken ?? randomUUID();
    const expiresAt = new Date(Date.now() + timeLimitMinutes * 60_000);

    const appointment = await this.appointmentRepository.update(existing.id, {
      expressBookingToken: token,
      expressBookingExpiresAt: expiresAt,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.express_resent',
      entityType: 'Appointment',
      entityId: appointment.id,
    });

    await this.sendCompletionLink(businessId, appointment.id);

    return toAppointmentResponse(appointment);
  }

  async getByToken(token: string) {
    const appointment = await this.requirePendingByToken(token);
    const settings = await this.settingsRepository.ensureSettings(
      appointment.businessId,
    );
    const business = await this.businessRepository.findById(
      appointment.businessId,
    );
    const timezone = resolveBookingTimezone(
      settings.timezone,
      business?.timezone,
    );
    const formSettings = await this.resolveFormSettings(
      appointment.businessId,
      settings.formSettings,
    );
    const serviceId = appointment.serviceId!;
    const service = await this.serviceRepository.findById(
      appointment.businessId,
      serviceId,
    );
    const flags = this.resolveExpressPaymentFlags(appointment, settings);
    const deposit = flags.paymentRequired
      ? this.resolveExpressDepositAmount(settings, service?.price ?? 0)
      : null;
    const staff = await this.listEligibleStaff(appointment);

    let contact: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phoneCountryCode: string | null;
      phoneNumber: string | null;
      companyName: string | null;
    } | null = null;

    if (appointment.contactId) {
      const row = await this.contactRepository.findById(
        appointment.businessId,
        appointment.contactId,
      );
      if (row) {
        contact = {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phoneCountryCode: row.phoneCountryCode,
          phoneNumber: row.phoneNumber,
          companyName: row.companyName,
        };
      }
    }

    return {
      token,
      expiresAt: appointment.expressBookingExpiresAt,
      businessId: appointment.businessId,
      businessName: business?.displayName ?? business?.name ?? 'Business',
      timezone,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      assignedToId: appointment.assignedToId,
      assignedTo: appointment.assignedTo
        ? {
            id: appointment.assignedTo.id,
            firstName: appointment.assignedTo.firstName,
            lastName: appointment.assignedTo.lastName,
          }
        : null,
      service: appointment.service
        ? {
            id: appointment.service.id,
            name: appointment.service.name,
          }
        : null,
      guestFirstName: appointment.guestFirstName,
      guestEmail: appointment.guestEmail,
      guestPhone: appointment.guestPhone,
      guestPhoneCountryCode: appointment.guestPhoneCountryCode,
      hasExistingContact: Boolean(appointment.contactId),
      contact,
      formSettings,
      requireCard: flags.requireCard,
      requireDeposit: flags.requireDeposit,
      paymentRequired: flags.paymentRequired,
      cardOnly: flags.cardOnly,
      amountCents: deposit
        ? Math.round(Number(deposit.chargeAmount) * 100)
        : 0,
      servicePriceCents: deposit
        ? Math.round(Number(deposit.servicePrice) * 100)
        : 0,
      remainingBalanceCents: deposit
        ? Math.round(Number(deposit.remainingBalance) * 100)
        : 0,
      isPartialDeposit: deposit ? !deposit.isFullPayment : false,
      policyVersion: settings.cancellationPolicyVersion,
      allowPhotoUpload: settings.expressAllowPhotoUpload,
      photoUploadPrompt: settings.photoUploadPrompt,
      publicSlug: settings.publicSlug,
      staff,
    };
  }

  async listStaffForToken(token: string) {
    const appointment = await this.requirePendingByToken(token);
    return this.listEligibleStaff(appointment);
  }

  async createCheckout(token: string, dto: ExpressCheckoutDto) {
    const appointment = await this.requirePendingByToken(token);
    const serviceId = appointment.serviceId!;
    const settings = await this.settingsRepository.ensureSettings(
      appointment.businessId,
    );
    const flags = this.resolveExpressPaymentFlags(appointment, settings);
    const staffId = dto.assignedToId ?? appointment.assignedToId;
    if (staffId && staffId !== appointment.assignedToId) {
      await this.assertStaffSwitchAllowed(appointment, staffId);
    }

    const business = await this.businessRepository.findById(
      appointment.businessId,
    );
    const timezone = resolveBookingTimezone(
      settings.timezone,
      business?.timezone,
    );
    const service = await this.serviceRepository.findById(
      appointment.businessId,
      serviceId,
    );

    const resolveContactId = async (): Promise<string> => {
      if (appointment.contactId) {
        return appointment.contactId;
      }
      if (!dto.customerName?.trim() || !dto.customerEmail?.trim()) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Customer name and email are required for payment',
          HttpStatus.BAD_REQUEST,
        );
      }
      const contact = await this.publicBookingContactService.resolveOrCreate(
        appointment.businessId,
        {
          customerName: dto.customerName.trim(),
          customerEmail: dto.customerEmail,
          phoneCountryCode: dto.phoneCountryCode,
          phoneNumber: dto.phoneNumber,
          source: 'Express Booking',
        },
      );
      return contact.id;
    };

    if (flags.paymentRequired) {
      const holdToken = randomUUID();
      const contactId = await resolveContactId();
      const deposit = this.resolveExpressDepositAmount(
        settings,
        service?.price ?? 0,
      );
      const amountDue = deposit.chargeAmount.toString();
      const currency = this.readBusinessCurrency(business?.settings);

      return this.bookingDepositPayment.createCheckout({
        holdToken,
        paymentRequired: true,
        holdPayload: {
          businessId: appointment.businessId,
          publicSlug: settings.publicSlug ?? 'express',
          serviceId,
          serviceName: service?.name ?? appointment.title,
          staffId: staffId ?? null,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          timezone,
          amountDue,
          currency,
          contactId,
        },
      });
    }

    if (flags.cardOnly) {
      const contactId = await resolveContactId();
      const setup = await this.stripeContactPaymentMethod.createSetupIntent(
        appointment.businessId,
        contactId,
      );
      return {
        paymentRequired: false,
        cardSetupRequired: true,
        holdToken: null,
        paymentIntentId: null,
        setupIntentClientSecret: setup.clientSecret,
        amountCents: 0,
        clientSecret: setup.clientSecret,
        publishableKey: setup.publishableKey,
        stripeAccountId: setup.stripeAccountId,
      };
    }

    return {
      paymentRequired: false,
      cardSetupRequired: false,
      holdToken: null,
      paymentIntentId: null,
      amountCents: 0,
      clientSecret: null,
      publishableKey: null,
      stripeAccountId: null,
    };
  }

  async complete(
    token: string,
    dto: ExpressCompleteDto,
    requestMeta?: { ipAddress?: string; userAgent?: string },
  ) {
    const appointment = await this.requirePendingByToken(token);
    const settings = await this.settingsRepository.ensureSettings(
      appointment.businessId,
    );
    const formSettings = await this.resolveFormSettings(
      appointment.businessId,
      settings.formSettings,
    );
    const hasExistingContact = Boolean(appointment.contactId);

    if (!hasExistingContact) {
      if (formSettings.requireEmail && !dto.customerEmail?.trim()) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Email is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (formSettings.requirePhone && !dto.phoneNumber?.trim()) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Phone number is required',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const policyRequired =
      formSettings.requirePolicyAgreement ||
      Boolean(formSettings.cancellationPolicyText?.trim());
    if (policyRequired && !dto.policyAgreed) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'You must agree to the cancellation policy',
        HttpStatus.BAD_REQUEST,
      );
    }

    const nextStaffId = dto.assignedToId ?? appointment.assignedToId;
    if (!nextStaffId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Staff member is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (nextStaffId !== appointment.assignedToId) {
      await this.assertStaffSwitchAllowed(appointment, nextStaffId);
    }

    const serviceId = appointment.serviceId!;
    const flags = this.resolveExpressPaymentFlags(appointment, settings);

    if (flags.paymentRequired) {
      if (!dto.paymentIntentId || !dto.holdToken) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Payment is required to complete this booking',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.bookingDepositPayment.verifyPaymentIntent(
        appointment.businessId,
        dto.paymentIntentId,
        { serviceId, holdToken: dto.holdToken },
      );
      await this.bookingDepositPayment.assertHoldValid(dto.holdToken, {
        businessId: appointment.businessId,
        serviceId,
      });
    }

    if (flags.cardOnly) {
      if (!dto.setupIntentId?.trim()) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Card setup is required to complete this booking',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    let contactId: string;
    if (appointment.contactId) {
      contactId = appointment.contactId;
    } else {
      if (!dto.customerName?.trim() || !dto.customerEmail?.trim()) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Customer name and email are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const contact = await this.publicBookingContactService.resolveOrCreate(
        appointment.businessId,
        {
          customerName: dto.customerName.trim(),
          customerEmail: dto.customerEmail,
          phoneCountryCode: dto.phoneCountryCode,
          phoneNumber: dto.phoneNumber,
          source: 'Express Booking',
        },
      );
      contactId = contact.id;

      const profileUpdate: {
        companyName?: string | null;
        lastName?: string | null;
      } = {};
      if (dto.companyName?.trim()) {
        profileUpdate.companyName = dto.companyName.trim();
      }
      if (dto.customerLastName?.trim()) {
        profileUpdate.lastName = dto.customerLastName.trim();
      }
      if (Object.keys(profileUpdate).length > 0) {
        await this.contactRepository.update(
          appointment.businessId,
          contactId,
          profileUpdate,
        );
      }
    }

    if (dto.policyAgreed) {
      await this.prisma.cancellationPolicyAcceptance.upsert({
        where: { appointmentId: appointment.id },
        create: {
          businessId: appointment.businessId,
          appointmentId: appointment.id,
          policyVersion: settings.cancellationPolicyVersion,
          ipAddress: requestMeta?.ipAddress ?? null,
          userAgent: requestMeta?.userAgent ?? null,
        },
        update: {
          policyVersion: settings.cancellationPolicyVersion,
          acceptedAt: new Date(),
          ipAddress: requestMeta?.ipAddress ?? null,
          userAgent: requestMeta?.userAgent ?? null,
        },
      });
    }

    const previousMetadata =
      appointment.metadata && typeof appointment.metadata === 'object'
        ? (appointment.metadata as Record<string, unknown>)
        : {};

    let prepaidCheckoutId: string | undefined;
    if (flags.paymentRequired && dto.paymentIntentId) {
      const service = await this.serviceRepository.findById(
        appointment.businessId,
        serviceId,
      );
      const deposit = this.resolveExpressDepositAmount(
        settings,
        service?.price ?? 0,
      );
      const currency = this.readBusinessCurrency(
        (
          await this.businessRepository.findById(appointment.businessId)
        )?.settings,
      );

      if (deposit.isFullPayment) {
        const sale = await this.bookingLinkSale.createPrepaidCheckoutSale({
          businessId: appointment.businessId,
          appointmentId: appointment.id,
          contactId,
          serviceId,
          serviceName: service?.name ?? appointment.title,
          staffUserId: nextStaffId,
          amount: deposit.chargeAmount.toString(),
          paymentIntentId: dto.paymentIntentId,
          currency,
        });
        prepaidCheckoutId = sale.checkoutId;
      } else {
        const sale = await this.bookingLinkSale.createPartialDepositCheckout({
          businessId: appointment.businessId,
          appointmentId: appointment.id,
          contactId,
          serviceId,
          serviceName: service?.name ?? appointment.title,
          staffUserId: nextStaffId,
          servicePrice: deposit.servicePrice.toString(),
          depositAmount: deposit.chargeAmount.toString(),
          paymentIntentId: dto.paymentIntentId,
          currency,
        });
        prepaidCheckoutId = sale.checkoutId;
      }
    }

    const uploadToken =
      settings.expressAllowPhotoUpload && settings.publicSlug
        ? randomUUID()
        : null;

    const serviceLine = appointment.serviceLines[0];
    const updated = await this.appointmentRepository.update(
      appointment.id,
      {
        contact: { connect: { id: contactId } },
        assignedTo: { connect: { id: nextStaffId } },
        status: this.resolveCompletionStatus(settings),
        notes: dto.notes?.trim() || appointment.notes,
        guestFirstName: null,
        guestEmail: null,
        guestPhone: null,
        guestPhoneCountryCode: null,
        expressBookingToken: null,
        expressBookingExpiresAt: null,
        expressBookingCompletedAt: new Date(),
        ...(appointment.clientManageToken
          ? {}
          : { clientManageToken: generateClientManageToken() }),
        metadata: {
          ...previousMetadata,
          policyAgreed: Boolean(dto.policyAgreed),
          reminderOptIn: Boolean(dto.reminderOptIn),
          ...(dto.paymentIntentId
            ? { paymentIntentId: dto.paymentIntentId }
            : {}),
          ...(dto.setupIntentId ? { setupIntentId: dto.setupIntentId } : {}),
          ...(prepaidCheckoutId ? { prepaidCheckoutId } : {}),
          ...(uploadToken
            ? {
                uploadToken,
                publicSlug: settings.publicSlug,
              }
            : {}),
          expressCompleted: true,
        },
      },
      serviceLine
        ? [
            {
              serviceId: serviceLine.serviceId,
              assignedToId: nextStaffId,
              startAt: serviceLine.startAt ?? appointment.startAt,
              durationMinutes: serviceLine.durationMinutes ?? undefined,
              price: serviceLine.price ?? undefined,
              sortOrder: 0,
            },
          ]
        : undefined,
    );

    if (dto.holdToken) {
      await this.bookingDepositPayment.releaseHold(dto.holdToken);
    }

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: appointment.businessId,
      action: 'appointment.express_completed',
      entityType: 'Appointment',
      entityId: appointment.id,
    });

    void this.appointmentNotificationService
      .sendOwnerNotifications(appointment.businessId, updated)
      .catch(() => undefined);
    void this.appointmentNotificationService
      .sendStaffNotifications(appointment.businessId, updated, 'booked')
      .catch(() => undefined);

    return {
      id: updated.id,
      status: updated.status,
      startAt: updated.startAt,
      endAt: updated.endAt,
      contactId: updated.contactId,
      assignedToId: updated.assignedToId,
      service: updated.service,
      allowPhotoUpload: settings.expressAllowPhotoUpload,
      photoUploadPrompt: settings.photoUploadPrompt,
      publicSlug: settings.publicSlug,
      uploadToken,
    };
  }

  async processExpired(): Promise<number> {
    const expired = await this.appointmentRepository.findExpiredPendingExpress(
      new Date(),
      100,
    );
    let count = 0;
    for (const appointment of expired) {
      try {
        const guestEmail = appointment.guestEmail?.trim();
        const guestFirstName = appointment.guestFirstName;
        const existingMeta =
          appointment.metadata &&
          typeof appointment.metadata === 'object' &&
          !Array.isArray(appointment.metadata)
            ? (appointment.metadata as Record<string, unknown>)
            : {};
        const cancelled = await this.appointmentRepository.update(
          appointment.id,
          {
            status: AppointmentStatus.CANCELLED,
            expressBookingToken: null,
            expressBookingExpiresAt: null,
            metadata: {
              ...existingMeta,
              expressExpired: true,
              cancellationType: 'expired_express',
            },
          },
        );
        if (guestEmail) {
          await this.sendExpiredEmail(appointment.businessId, {
            ...cancelled,
            guestEmail,
            guestFirstName,
          });
        }
        count += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to expire express appointment ${appointment.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return count;
  }

  async processSoftDeleteExpiredCancelled(
    now = new Date(),
  ): Promise<number> {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60_000);
    const result = await this.prisma.appointment.updateMany({
      where: {
        source: AppointmentSource.EXPRESS,
        status: AppointmentStatus.CANCELLED,
        deletedAt: null,
        updatedAt: { lt: cutoff },
      },
      data: { deletedAt: now },
    });
    return result.count;
  }

  private resolveExpressPaymentFlags(
    appointment: {
      expressRequireCard?: boolean | null;
      expressRequireDeposit?: boolean | null;
    },
    settings: { expressRequireCard: boolean; expressRequireDeposit: boolean },
  ) {
    const requireCard =
      appointment.expressRequireCard ?? settings.expressRequireCard;
    const requireDeposit =
      appointment.expressRequireDeposit ?? settings.expressRequireDeposit;
    return {
      requireCard: Boolean(requireCard),
      requireDeposit: Boolean(requireDeposit),
      // deposit takes precedence for charging
      paymentRequired: Boolean(requireDeposit),
      cardOnly: Boolean(requireCard) && !Boolean(requireDeposit),
    };
  }

  private resolveExpressDepositAmount(
    settings: Pick<
      BusinessOnlineBookingSettings,
      'expressDepositType' | 'expressDepositAmount'
    >,
    servicePrice: string | number | null | undefined,
  ) {
    return resolveExpressDeposit({
      depositType: settings.expressDepositType,
      depositAmount: settings.expressDepositAmount,
      servicePrice,
    });
  }

  private resolveCompletionStatus(settings: {
    requireApproval: boolean;
    autoConfirm: boolean;
  }): AppointmentStatus {
    if (settings.requireApproval) return AppointmentStatus.UNCONFIRMED;
    if (settings.autoConfirm) return AppointmentStatus.CONFIRMED;
    return AppointmentStatus.UNCONFIRMED;
  }

  private readBusinessCurrency(settings: unknown): string {
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      const currency = (settings as Record<string, unknown>).currency;
      if (typeof currency === 'string' && currency.trim()) {
        return currency.trim().toUpperCase();
      }
    }
    return 'USD';
  }

  private async sendCompletionLink(businessId: string, appointmentId: string) {
    const appointment = await this.appointmentRepository.findById(
      businessId,
      appointmentId,
    );
    if (!appointment || !appointment.expressBookingToken) {
      return;
    }

    const business = await this.businessRepository.findById(businessId);
    const settings = await this.settingsRepository.ensureSettings(businessId);
    const timezone = resolveBookingTimezone(
      settings.timezone,
      business?.timezone,
    );
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL', '') ?? ''
    ).replace(/\/$/, '');
    const completeUrl = `${frontendUrl}/express/${appointment.expressBookingToken}`;
    const contactName =
      appointment.guestFirstName ??
      appointment.contact?.firstName ??
      appointment.contact?.displayName ??
      'there';
    const businessName = business?.displayName ?? business?.name ?? 'Business';
    const expiresAtLabel = appointment.expressBookingExpiresAt
      ? formatAppointmentDateTime(appointment.expressBookingExpiresAt, timezone)
      : '';

    const toEmail =
      appointment.guestEmail?.trim() ||
      appointment.contact?.email?.trim() ||
      null;
    const toPhone = formatPhone(
      appointment.guestPhoneCountryCode ??
        appointment.contact?.phoneCountryCode,
      appointment.guestPhone ?? appointment.contact?.phoneNumber,
    );

    await this.notificationDispatch.dispatch({
      businessId,
      notificationKey: APPOINTMENT_EXPRESS_COMPLETE_KEY,
      toEmail,
      toPhone,
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-express-complete-${appointment.id}-${appointment.expressBookingToken}`,
      missingRecipient: 'throw',
      variables: {
        'business.name': businessName,
        'contact.name': contactName,
        'appointment.start_at': formatAppointmentDateTime(
          appointment.startAt,
          timezone,
        ),
        'appointment.end_at': formatAppointmentDateTime(
          appointment.endAt,
          timezone,
        ),
        'appointment.service_name':
          appointment.service?.name ?? appointment.title,
        'appointment.title': appointment.title,
        'express.expires_at': expiresAtLabel,
        'express.complete_url': completeUrl,
      },
    });
  }

  private async sendExpiredEmail(
    businessId: string,
    appointment: AppointmentWithRelations & {
      guestEmail: string;
      guestFirstName: string | null;
      guestPhone?: string | null;
      guestPhoneCountryCode?: string | null;
    },
  ) {
    const business = await this.businessRepository.findById(businessId);
    const settings = await this.settingsRepository.ensureSettings(businessId);
    const timezone = resolveBookingTimezone(
      settings.timezone,
      business?.timezone,
    );

    await this.notificationDispatch.dispatch({
      businessId,
      notificationKey: 'appointment.express_expired',
      toEmail: appointment.guestEmail,
      toPhone: formatPhone(
        appointment.guestPhoneCountryCode,
        appointment.guestPhone,
      ),
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-express-expired-${appointment.id}`,
      missingRecipient: 'skip',
      variables: {
        'business.name': business?.displayName ?? business?.name ?? 'Business',
        'contact.name': appointment.guestFirstName ?? 'there',
        'appointment.start_at': formatAppointmentDateTime(
          appointment.startAt,
          timezone,
        ),
        'appointment.end_at': formatAppointmentDateTime(
          appointment.endAt,
          timezone,
        ),
        'appointment.service_name':
          appointment.service?.name ?? appointment.title,
        'appointment.title': appointment.title,
      },
    });
  }

  private async resolveFormSettings(
    businessId: string,
    formSettings: unknown,
  ) {
    const cancelRescheduleSettings =
      await this.cancelRescheduleSettingsRepository.ensureSettings(businessId);
    return readFormSettings(formSettings, {
      cancellationPolicyHtml: cancelRescheduleSettings.cancellationPolicyHtml,
      requirePolicyAgreement: cancelRescheduleSettings.requirePolicyAgreement,
    });
  }

  private async requirePendingByToken(token: string) {
    const appointment =
      await this.appointmentRepository.findByExpressToken(token.trim());
    if (!appointment) {
      throw new AppException(
        ErrorCode.EXPRESS_BOOKING_INVALID,
        'This booking link is invalid or has already been used',
        HttpStatus.NOT_FOUND,
      );
    }
    if (appointment.status !== AppointmentStatus.PENDING_COMPLETION) {
      throw new AppException(
        ErrorCode.EXPRESS_BOOKING_INVALID,
        'This booking link is no longer available',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      appointment.expressBookingExpiresAt &&
      appointment.expressBookingExpiresAt.getTime() <= Date.now()
    ) {
      throw new AppException(
        ErrorCode.EXPRESS_BOOKING_EXPIRED,
        'This booking link has expired',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!appointment.serviceId) {
      throw new AppException(
        ErrorCode.EXPRESS_BOOKING_INVALID,
        'Express booking is missing a service',
        HttpStatus.BAD_REQUEST,
      );
    }
    return appointment;
  }

  private async assertStaffForService(
    businessId: string,
    serviceId: string,
    staffId: string,
  ) {
    const workspace = await this.workspaceRepository.findWorkspace(
      businessId,
      serviceId,
    );
    const match = workspace?.staffAssignments.find(
      (a) => a.userId === staffId && a.isEnabled,
    );
    if (!match) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Selected staff cannot provide this service',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertStaffSlotAvailable(params: {
    businessId: string;
    staffId: string;
    startAt: Date;
    endAt: Date;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    excludeAppointmentId?: string;
  }) {
    const candidate = resolveAppointmentBlockingWindow(
      { startAt: params.startAt, endAt: params.endAt },
      {
        bufferBeforeMinutes: params.bufferBeforeMinutes,
        bufferAfterMinutes: params.bufferAfterMinutes,
      },
    );
    const conflicts =
      await this.appointmentRepository.findStaffBlockingInRange(
        params.businessId,
        null,
        candidate.blockStart,
        candidate.blockEnd,
        params.staffId,
        params.excludeAppointmentId,
      );
    const overlapping = conflicts.filter((existing) =>
      appointmentBlocksOverlap(
        resolveAppointmentBlockingWindow(existing),
        candidate,
      ),
    );
    if (overlapping.length > 0) {
      throw new AppException(
        ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
        'This time slot is no longer available for the selected staff member',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async assertStaffSwitchAllowed(
    appointment: AppointmentWithRelations,
    staffId: string,
  ) {
    await this.assertStaffForService(
      appointment.businessId,
      appointment.serviceId!,
      staffId,
    );

    const service = await this.serviceRepository.findById(
      appointment.businessId,
      appointment.serviceId!,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const timing = resolveServiceTiming({
      durationMinutes: service.durationMinutes,
      hasProcessingTime: service.hasProcessingTime,
      processingDurationMinutes: service.processingDurationMinutes,
      finishDurationMinutes: service.finishDurationMinutes,
      hasBufferTime: service.hasBufferTime,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
    });

    await this.assertStaffSlotAvailable({
      businessId: appointment.businessId,
      staffId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      bufferBeforeMinutes: timing.bufferBeforeMinutes,
      bufferAfterMinutes: timing.bufferAfterMinutes,
      excludeAppointmentId: appointment.id,
    });
  }

  private async listEligibleStaff(appointment: AppointmentWithRelations) {
    const workspace = await this.workspaceRepository.findWorkspace(
      appointment.businessId,
      appointment.serviceId!,
    );
    const settings = await this.settingsRepository.ensureSettings(
      appointment.businessId,
    );
    const excluded = Array.isArray(settings.anyoneExcludedStaffIds)
      ? (settings.anyoneExcludedStaffIds as unknown[]).filter(
          (id): id is string => typeof id === 'string',
        )
      : [];

    const service = await this.serviceRepository.findById(
      appointment.businessId,
      appointment.serviceId!,
    );
    const timing = service
      ? resolveServiceTiming({
          durationMinutes: service.durationMinutes,
          hasProcessingTime: service.hasProcessingTime,
          processingDurationMinutes: service.processingDurationMinutes,
          finishDurationMinutes: service.finishDurationMinutes,
          hasBufferTime: service.hasBufferTime,
          bufferBeforeMinutes: service.bufferBeforeMinutes,
          bufferAfterMinutes: service.bufferAfterMinutes,
        })
      : null;

    const candidates = (workspace?.staffAssignments ?? []).filter(
      (a) =>
        a.isEnabled &&
        a.onlineBookingEnabled &&
        !excluded.includes(a.userId),
    );

    const result: Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      available: boolean;
    }> = [];

    for (const row of candidates) {
      let available = true;
      if (timing) {
        try {
          await this.assertStaffSlotAvailable({
            businessId: appointment.businessId,
            staffId: row.userId,
            startAt: appointment.startAt,
            endAt: appointment.endAt,
            bufferBeforeMinutes: timing.bufferBeforeMinutes,
            bufferAfterMinutes: timing.bufferAfterMinutes,
            excludeAppointmentId: appointment.id,
          });
        } catch {
          available = false;
        }
      }
      result.push({
        id: row.userId,
        firstName: row.user?.firstName ?? null,
        lastName: row.user?.lastName ?? null,
        available: available || row.userId === appointment.assignedToId,
      });
    }

    if (settings.randomizeStaffOrder) {
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    }

    return result;
  }
}
