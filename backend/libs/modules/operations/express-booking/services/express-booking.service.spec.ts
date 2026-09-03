import { AppointmentSource, AppointmentStatus } from '@prisma/client';
import { ExpressBookingService } from './express-booking.service';

describe('ExpressBookingService', () => {
  const appointmentRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByExpressToken: jest.fn(),
    findExpiredPendingExpress: jest.fn(),
    findStaffBlockingInRange: jest.fn().mockResolvedValue([]),
  };
  const settingsRepository = {
    ensureSettings: jest.fn(),
  };
  const serviceRepository = {
    findById: jest.fn(),
  };
  const workspaceRepository = {
    findWorkspace: jest.fn(),
    findOnlineBookingSettings: jest.fn(),
  };
  const publicBookingContactService = {
    resolveOrCreate: jest.fn(),
  };
  const bookingDepositPayment = {
    createCheckout: jest.fn(),
    verifyPaymentIntent: jest.fn(),
    assertHoldValid: jest.fn(),
    releaseHold: jest.fn(),
  };
  const bookingLinkSale = {
    createPrepaidCheckoutSale: jest.fn(),
    createPartialDepositCheckout: jest.fn(),
  };
  const stripeContactPaymentMethod = {
    createSetupIntent: jest.fn(),
  };
  const prisma = {
    cancellationPolicyAcceptance: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    appointment: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const appointmentNotificationService = {
    sendOwnerNotifications: jest.fn().mockResolvedValue(undefined),
    sendStaffNotifications: jest.fn().mockResolvedValue(undefined),
  };
  const businessRepository = {
    findById: jest.fn(),
  };
  const contactRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const auditService = {
    log: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('http://localhost:3001'),
  };
  const notificationChannelPreference = {
    getChannel: jest.fn().mockResolvedValue('EMAIL'),
  };
  const notificationDispatch = {
    dispatch: jest.fn().mockResolvedValue('email'),
  };
  const cancelRescheduleSettingsRepository = {
    ensureSettings: jest.fn().mockResolvedValue({
      cancellationPolicyHtml: null,
      requirePolicyAgreement: false,
    }),
  };

  const service = new ExpressBookingService(
    appointmentRepository as never,
    settingsRepository as never,
    serviceRepository as never,
    workspaceRepository as never,
    publicBookingContactService as never,
    bookingDepositPayment as never,
    bookingLinkSale as never,
    stripeContactPaymentMethod as never,
    prisma as never,
    appointmentNotificationService as never,
    businessRepository as never,
    contactRepository as never,
    auditService as never,
    configService as never,
    notificationChannelPreference as never,
    notificationDispatch as never,
    cancelRescheduleSettingsRepository as never,
  );

  const actor = { id: 'user-1', businessId: 'biz-1' } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationChannelPreference.getChannel.mockResolvedValue('EMAIL');
    settingsRepository.ensureSettings.mockResolvedValue({
      expressBookingEnabled: true,
      expressBookingTimeLimitMinutes: 30,
      expressRequireCard: false,
      expressRequireDeposit: false,
      expressDepositType: 'FULL',
      expressDepositAmount: null,
      expressAllowPhotoUpload: false,
      cancellationPolicyVersion: '1',
      requireApproval: false,
      autoConfirm: false,
      timezone: 'UTC',
      formSettings: {},
      publicSlug: 'demo',
      anyoneExcludedStaffIds: [],
      randomizeStaffOrder: false,
    });
    serviceRepository.findById.mockResolvedValue({
      id: 'svc-1',
      name: 'Haircut',
      durationMinutes: 30,
      hasProcessingTime: false,
      processingDurationMinutes: null,
      finishDurationMinutes: null,
      hasBufferTime: false,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      price: 50,
    });
    workspaceRepository.findWorkspace.mockResolvedValue({
      staffAssignments: [
        {
          userId: 'staff-1',
          isEnabled: true,
          onlineBookingEnabled: true,
          user: { firstName: 'Sam', lastName: 'Staff' },
        },
      ],
    });
    businessRepository.findById.mockResolvedValue({
      name: 'Demo Spa',
      displayName: 'Demo Spa',
      timezone: 'UTC',
      settings: { currency: 'USD' },
    });
    appointmentRepository.create.mockResolvedValue({
      id: 'appt-1',
      businessId: 'biz-1',
      status: AppointmentStatus.PENDING_COMPLETION,
      source: AppointmentSource.EXPRESS,
      guestFirstName: 'Alex',
      guestEmail: 'alex@example.com',
      expressBookingToken: 'token-1',
      expressBookingExpiresAt: new Date(Date.now() + 30 * 60_000),
      expressRequireCard: null,
      expressRequireDeposit: null,
      expressTimeLimitMinutes: null,
      startAt: new Date('2030-01-01T15:00:00.000Z'),
      endAt: new Date('2030-01-01T15:30:00.000Z'),
      serviceId: 'svc-1',
      assignedToId: 'staff-1',
      title: 'Alex — Haircut',
      calendar: null,
      contact: null,
      service: { id: 'svc-1', name: 'Haircut' },
      serviceLines: [],
      assignedTo: null,
      createdBy: null,
      invoices: [],
      metadata: null,
      guestPhone: null,
      guestPhoneCountryCode: null,
      expressBookingCompletedAt: null,
      calendarId: null,
      contactId: null,
      workItemId: null,
      description: null,
      locationType: null,
      locationValue: null,
      notes: null,
      externalProvider: null,
      externalEventId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdById: 'user-1',
    });
    appointmentRepository.findById.mockImplementation(async () =>
      appointmentRepository.create.mock.results[0]?.value,
    );
  });

  it('creates a pending express appointment and emails the completion link', async () => {
    const result = await service.create(
      'biz-1',
      {
        guestFirstName: 'Alex',
        guestEmail: 'alex@example.com',
        serviceId: 'svc-1',
        startAt: '2030-01-01T15:00:00.000Z',
        assignedToId: 'staff-1',
      },
      actor,
    );

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({
        status: AppointmentStatus.PENDING_COMPLETION,
        source: AppointmentSource.EXPRESS,
        contactId: null,
        guestFirstName: 'Alex',
        guestEmail: 'alex@example.com',
        assignedToId: 'staff-1',
        expressRequireCard: null,
        expressRequireDeposit: null,
        expressTimeLimitMinutes: null,
      }),
      expect.any(Array),
    );
    expect(notificationDispatch.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationKey: 'appointment.express_complete',
        toEmail: 'alex@example.com',
        missingRecipient: 'throw',
      }),
    );
    expect(result.status).toBe(AppointmentStatus.PENDING_COMPLETION);
  });

  it('creates a pending express appointment and texts the completion link', async () => {
    notificationChannelPreference.getChannel.mockResolvedValue('SMS');
    notificationDispatch.dispatch.mockResolvedValue('sms');
    const smsAppointment = {
      id: 'appt-sms-1',
      businessId: 'biz-1',
      status: AppointmentStatus.PENDING_COMPLETION,
      source: AppointmentSource.EXPRESS,
      guestFirstName: 'Alex',
      guestEmail: null,
      guestPhone: '5551234567',
      guestPhoneCountryCode: '+1',
      expressBookingToken: 'token-sms',
      expressBookingExpiresAt: new Date(Date.now() + 30 * 60_000),
      expressRequireCard: null,
      expressRequireDeposit: null,
      expressTimeLimitMinutes: null,
      startAt: new Date('2030-01-01T15:00:00.000Z'),
      endAt: new Date('2030-01-01T15:30:00.000Z'),
      serviceId: 'svc-1',
      assignedToId: 'staff-1',
      title: 'Alex — Haircut',
      calendar: null,
      contact: null,
      service: { id: 'svc-1', name: 'Haircut' },
      serviceLines: [],
      assignedTo: null,
      createdBy: null,
      invoices: [],
      metadata: null,
      expressBookingCompletedAt: null,
      calendarId: null,
      contactId: null,
      workItemId: null,
      description: null,
      locationType: null,
      locationValue: null,
      notes: null,
      externalProvider: null,
      externalEventId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdById: 'user-1',
    };
    appointmentRepository.create.mockResolvedValue(smsAppointment);
    appointmentRepository.findById.mockResolvedValue(smsAppointment);

    const result = await service.create(
      'biz-1',
      {
        guestFirstName: 'Alex',
        guestPhone: '5551234567',
        guestPhoneCountryCode: '+1',
        serviceId: 'svc-1',
        startAt: '2030-01-01T15:00:00.000Z',
        assignedToId: 'staff-1',
      },
      actor,
    );

    expect(notificationDispatch.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationKey: 'appointment.express_complete',
        toPhone: '+15551234567',
        missingRecipient: 'throw',
        variables: expect.objectContaining({
          'express.complete_url': expect.stringContaining('/express/token-sms'),
        }),
      }),
    );
    expect(result.id).toBe('appt-sms-1');
  });

  it('rejects SMS create when guest phone is missing', async () => {
    notificationChannelPreference.getChannel.mockResolvedValue('SMS');

    await expect(
      service.create(
        'biz-1',
        {
          guestFirstName: 'Alex',
          guestEmail: 'alex@example.com',
          serviceId: 'svc-1',
          startAt: '2030-01-01T15:00:00.000Z',
          assignedToId: 'staff-1',
        },
        actor,
      ),
    ).rejects.toThrow(
      'Provide either an existing contact or guest first name and phone',
    );
    expect(notificationDispatch.dispatch).not.toHaveBeenCalled();
  });

  it('rejects create when both contact and guest are missing', async () => {
    await expect(
      service.create(
        'biz-1',
        {
          serviceId: 'svc-1',
          startAt: '2030-01-01T15:00:00.000Z',
          assignedToId: 'staff-1',
        },
        actor,
      ),
    ).rejects.toThrow(
      'Provide either an existing contact or guest first name and email',
    );
  });

  it('rejects create when Express Booking is disabled', async () => {
    settingsRepository.ensureSettings.mockResolvedValue({
      expressBookingEnabled: false,
      expressBookingTimeLimitMinutes: 30,
    });

    await expect(
      service.create(
        'biz-1',
        {
          guestFirstName: 'Alex',
          guestEmail: 'alex@example.com',
          serviceId: 'svc-1',
          startAt: '2030-01-01T15:00:00.000Z',
          assignedToId: 'staff-1',
        },
        actor,
      ),
    ).rejects.toThrow('Express Booking is not enabled for this business');
  });

  it('completes to UNCONFIRMED and resolves contact', async () => {
    const pending = {
      id: 'appt-1',
      businessId: 'biz-1',
      status: AppointmentStatus.PENDING_COMPLETION,
      serviceId: 'svc-1',
      assignedToId: 'staff-1',
      contactId: null,
      startAt: new Date('2030-01-01T15:00:00.000Z'),
      endAt: new Date('2030-01-01T15:30:00.000Z'),
      expressBookingExpiresAt: new Date(Date.now() + 60_000),
      expressBookingToken: 'token-1',
      expressRequireCard: null,
      expressRequireDeposit: null,
      guestFirstName: 'Alex',
      guestEmail: 'alex@example.com',
      title: 'Alex — Haircut',
      notes: null,
      metadata: null,
      service: { id: 'svc-1', name: 'Haircut' },
      serviceLines: [
        {
          serviceId: 'svc-1',
          assignedToId: 'staff-1',
          startAt: new Date('2030-01-01T15:00:00.000Z'),
          durationMinutes: 30,
          price: 50,
          sortOrder: 0,
        },
      ],
      assignedTo: null,
    };
    appointmentRepository.findByExpressToken.mockResolvedValue(pending);
    publicBookingContactService.resolveOrCreate.mockResolvedValue({
      id: 'contact-1',
    });
    appointmentRepository.update.mockResolvedValue({
      ...pending,
      status: AppointmentStatus.UNCONFIRMED,
      contactId: 'contact-1',
      service: pending.service,
    });

    const result = await service.complete('token-1', {
      customerName: 'Alex Rivera',
      customerEmail: 'alex@example.com',
      assignedToId: 'staff-1',
      policyAgreed: true,
    });

    expect(publicBookingContactService.resolveOrCreate).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({
        customerName: 'Alex Rivera',
        source: 'Express Booking',
      }),
    );
    expect(prisma.cancellationPolicyAcceptance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { appointmentId: 'appt-1' },
      }),
    );
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      'appt-1',
      expect.objectContaining({
        status: AppointmentStatus.UNCONFIRMED,
        contact: { connect: { id: 'contact-1' } },
        expressBookingToken: null,
      }),
      expect.any(Array),
    );
    expect(result.status).toBe(AppointmentStatus.UNCONFIRMED);
  });

  it('completes to CONFIRMED when autoConfirm is enabled', async () => {
    settingsRepository.ensureSettings.mockResolvedValue({
      expressBookingEnabled: true,
      expressBookingTimeLimitMinutes: 30,
      expressRequireCard: false,
      expressRequireDeposit: false,
      expressDepositType: 'FULL',
      expressDepositAmount: null,
      expressAllowPhotoUpload: false,
      cancellationPolicyVersion: '1',
      requireApproval: false,
      autoConfirm: true,
      timezone: 'UTC',
      formSettings: {},
      publicSlug: 'demo',
      anyoneExcludedStaffIds: [],
      randomizeStaffOrder: false,
    });
    const pending = {
      id: 'appt-1',
      businessId: 'biz-1',
      status: AppointmentStatus.PENDING_COMPLETION,
      serviceId: 'svc-1',
      assignedToId: 'staff-1',
      contactId: 'contact-existing',
      startAt: new Date('2030-01-01T15:00:00.000Z'),
      endAt: new Date('2030-01-01T15:30:00.000Z'),
      expressBookingExpiresAt: new Date(Date.now() + 60_000),
      expressBookingToken: 'token-1',
      expressRequireCard: null,
      expressRequireDeposit: null,
      guestFirstName: 'Alex',
      guestEmail: 'alex@example.com',
      title: 'Alex — Haircut',
      notes: null,
      metadata: null,
      service: { id: 'svc-1', name: 'Haircut' },
      serviceLines: [],
      assignedTo: null,
    };
    appointmentRepository.findByExpressToken.mockResolvedValue(pending);
    appointmentRepository.update.mockResolvedValue({
      ...pending,
      status: AppointmentStatus.CONFIRMED,
      contactId: 'contact-existing',
      service: pending.service,
    });

    const result = await service.complete('token-1', {
      assignedToId: 'staff-1',
      policyAgreed: true,
    });

    expect(publicBookingContactService.resolveOrCreate).not.toHaveBeenCalled();
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      'appt-1',
      expect.objectContaining({
        status: AppointmentStatus.CONFIRMED,
        contact: { connect: { id: 'contact-existing' } },
      }),
      undefined,
    );
    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('expires pending express appointments and emails guests', async () => {
    appointmentRepository.findExpiredPendingExpress.mockResolvedValue([
      {
        id: 'appt-exp',
        businessId: 'biz-1',
        guestEmail: 'alex@example.com',
        guestFirstName: 'Alex',
        startAt: new Date('2030-01-01T15:00:00.000Z'),
        endAt: new Date('2030-01-01T15:30:00.000Z'),
        title: 'Alex — Haircut',
        service: { id: 'svc-1', name: 'Haircut' },
      },
    ]);
    appointmentRepository.update.mockResolvedValue({
      id: 'appt-exp',
      businessId: 'biz-1',
      status: AppointmentStatus.CANCELLED,
      startAt: new Date('2030-01-01T15:00:00.000Z'),
      endAt: new Date('2030-01-01T15:30:00.000Z'),
      title: 'Alex — Haircut',
      service: { id: 'svc-1', name: 'Haircut' },
    });

    const count = await service.processExpired();

    expect(count).toBe(1);
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      'appt-exp',
      expect.objectContaining({
        status: AppointmentStatus.CANCELLED,
        expressBookingToken: null,
      }),
    );
    expect(notificationDispatch.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationKey: 'appointment.express_expired',
        toEmail: 'alex@example.com',
      }),
    );
  });

  it('soft-deletes cancelled express appointments older than 24h', async () => {
    prisma.appointment.updateMany.mockResolvedValue({ count: 2 });

    const count = await service.processSoftDeleteExpiredCancelled();

    expect(count).toBe(2);
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: AppointmentSource.EXPRESS,
          status: AppointmentStatus.CANCELLED,
          deletedAt: null,
        }),
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('returns partial deposit amounts from getByToken', async () => {
    settingsRepository.ensureSettings.mockResolvedValue({
      expressBookingEnabled: true,
      expressBookingTimeLimitMinutes: 30,
      expressRequireCard: false,
      expressRequireDeposit: true,
      expressDepositType: 'PERCENTAGE',
      expressDepositAmount: 25,
      expressAllowPhotoUpload: false,
      cancellationPolicyVersion: '1',
      requireApproval: false,
      autoConfirm: false,
      timezone: 'UTC',
      formSettings: {},
      publicSlug: 'demo',
      anyoneExcludedStaffIds: [],
      randomizeStaffOrder: false,
    });
    appointmentRepository.findByExpressToken.mockResolvedValue({
      id: 'appt-1',
      businessId: 'biz-1',
      status: AppointmentStatus.PENDING_COMPLETION,
      serviceId: 'svc-1',
      assignedToId: 'staff-1',
      contactId: null,
      startAt: new Date('2030-01-01T15:00:00.000Z'),
      endAt: new Date('2030-01-01T15:30:00.000Z'),
      expressBookingExpiresAt: new Date(Date.now() + 60_000),
      expressBookingToken: 'token-1',
      expressRequireCard: null,
      expressRequireDeposit: null,
      guestFirstName: 'Alex',
      guestEmail: 'alex@example.com',
      title: 'Alex — Haircut',
      service: { id: 'svc-1', name: 'Haircut' },
      serviceLines: [],
      assignedTo: null,
      metadata: null,
    });

    const result = await service.getByToken('token-1');

    expect(result.paymentRequired).toBe(true);
    expect(result.amountCents).toBe(1250);
    expect(result.servicePriceCents).toBe(5000);
    expect(result.remainingBalanceCents).toBe(3750);
    expect(result.isPartialDeposit).toBe(true);
  });

  it('creates partial deposit checkout on complete when deposit is partial', async () => {
    settingsRepository.ensureSettings.mockResolvedValue({
      expressBookingEnabled: true,
      expressBookingTimeLimitMinutes: 30,
      expressRequireCard: false,
      expressRequireDeposit: true,
      expressDepositType: 'FIXED',
      expressDepositAmount: 20,
      expressAllowPhotoUpload: false,
      cancellationPolicyVersion: '1',
      requireApproval: false,
      autoConfirm: false,
      timezone: 'UTC',
      formSettings: {},
      publicSlug: 'demo',
      anyoneExcludedStaffIds: [],
      randomizeStaffOrder: false,
    });
    const pending = {
      id: 'appt-1',
      businessId: 'biz-1',
      status: AppointmentStatus.PENDING_COMPLETION,
      serviceId: 'svc-1',
      assignedToId: 'staff-1',
      contactId: 'contact-existing',
      startAt: new Date('2030-01-01T15:00:00.000Z'),
      endAt: new Date('2030-01-01T15:30:00.000Z'),
      expressBookingExpiresAt: new Date(Date.now() + 60_000),
      expressBookingToken: 'token-1',
      expressRequireCard: null,
      expressRequireDeposit: true,
      guestFirstName: 'Alex',
      guestEmail: 'alex@example.com',
      title: 'Alex — Haircut',
      notes: null,
      metadata: null,
      service: { id: 'svc-1', name: 'Haircut' },
      serviceLines: [
        {
          serviceId: 'svc-1',
          assignedToId: 'staff-1',
          startAt: new Date('2030-01-01T15:00:00.000Z'),
          durationMinutes: 30,
          price: 50,
          sortOrder: 0,
        },
      ],
      assignedTo: null,
    };
    appointmentRepository.findByExpressToken.mockResolvedValue(pending);
    bookingDepositPayment.verifyPaymentIntent.mockResolvedValue(undefined);
    bookingLinkSale.createPartialDepositCheckout.mockResolvedValue({
      checkoutId: 'checkout-partial',
    });
    appointmentRepository.update.mockResolvedValue({
      ...pending,
      status: AppointmentStatus.UNCONFIRMED,
      contactId: 'contact-existing',
      service: pending.service,
    });

    await service.complete('token-1', {
      assignedToId: 'staff-1',
      policyAgreed: true,
      paymentIntentId: 'pi_partial',
      holdToken: 'hold-1',
    });

    expect(bookingLinkSale.createPartialDepositCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        appointmentId: 'appt-1',
        servicePrice: '50',
        depositAmount: '20',
        paymentIntentId: 'pi_partial',
      }),
    );
    expect(bookingLinkSale.createPrepaidCheckoutSale).not.toHaveBeenCalled();
  });

  it('returns upload token on complete when express photos are enabled', async () => {
    settingsRepository.ensureSettings.mockResolvedValue({
      expressBookingEnabled: true,
      expressBookingTimeLimitMinutes: 30,
      expressRequireCard: false,
      expressRequireDeposit: false,
      expressDepositType: 'FULL',
      expressDepositAmount: null,
      expressAllowPhotoUpload: true,
      photoUploadPrompt: 'Share inspiration photos',
      cancellationPolicyVersion: '1',
      requireApproval: false,
      autoConfirm: false,
      timezone: 'UTC',
      formSettings: {},
      publicSlug: 'demo',
      anyoneExcludedStaffIds: [],
      randomizeStaffOrder: false,
    });
    const pending = {
      id: 'appt-1',
      businessId: 'biz-1',
      status: AppointmentStatus.PENDING_COMPLETION,
      serviceId: 'svc-1',
      assignedToId: 'staff-1',
      contactId: 'contact-existing',
      startAt: new Date('2030-01-01T15:00:00.000Z'),
      endAt: new Date('2030-01-01T15:30:00.000Z'),
      expressBookingExpiresAt: new Date(Date.now() + 60_000),
      expressBookingToken: 'token-1',
      expressRequireCard: null,
      expressRequireDeposit: null,
      guestFirstName: 'Alex',
      guestEmail: 'alex@example.com',
      title: 'Alex — Haircut',
      notes: null,
      metadata: null,
      service: { id: 'svc-1', name: 'Haircut' },
      serviceLines: [],
      assignedTo: null,
    };
    appointmentRepository.findByExpressToken.mockResolvedValue(pending);
    appointmentRepository.update.mockResolvedValue({
      ...pending,
      status: AppointmentStatus.UNCONFIRMED,
      contactId: 'contact-existing',
      service: pending.service,
    });

    const result = await service.complete('token-1', {
      assignedToId: 'staff-1',
      policyAgreed: true,
    });

    expect(result.uploadToken).toEqual(expect.any(String));
    expect(result.publicSlug).toBe('demo');
    expect(result.allowPhotoUpload).toBe(true);
    expect(result.photoUploadPrompt).toBe('Share inspiration photos');
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      'appt-1',
      expect.objectContaining({
        metadata: expect.objectContaining({
          uploadToken: expect.any(String),
          publicSlug: 'demo',
        }),
      }),
      undefined,
    );
  });
});
