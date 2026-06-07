import { AppointmentNotificationService } from './appointment-notification.service';

describe('AppointmentNotificationService', () => {
  const appointment = {
    id: 'appt-1',
    contactId: 'contact-1',
    title: 'Jane - Consultations',
    startAt: new Date('2026-06-10T14:00:00Z'),
    endAt: new Date('2026-06-10T15:00:00Z'),
    calendar: { id: 'cal-1', name: 'Consultations', color: null },
    contact: {
      id: 'contact-1',
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: null,
      email: 'jane@example.com',
    },
    service: null,
    assignedTo: null,
  };

  function createService() {
    const emailNotificationService = {
      enqueueTransactionalEmail: jest.fn().mockResolvedValue(undefined),
    };
    const businessRepository = {
      findById: jest.fn().mockResolvedValue({ name: 'Acme' }),
    };
    const membershipRepository = {
      findOwnersAndAdmins: jest.fn().mockResolvedValue([
        { userId: 'owner-1', user: { email: 'owner@example.com' } },
      ]),
    };

    const service = new AppointmentNotificationService(
      emailNotificationService as never,
      businessRepository as never,
      membershipRepository as never,
    );

    return { service, emailNotificationService, membershipRepository };
  }

  it('enqueues appointment.cancelled with idempotency key', async () => {
    const { service, emailNotificationService } = createService();

    await service.sendCancelled('biz-1', appointment as never);

    expect(emailNotificationService.enqueueTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'appointment.cancelled',
        idempotencyKey: 'appointment-cancelled-appt-1',
      }),
    );
  });

  it('enqueues appointment.rescheduled with startAt in idempotency key', async () => {
    const { service, emailNotificationService } = createService();

    await service.sendRescheduled(
      'biz-1',
      appointment as never,
      new Date('2026-06-10T13:00:00Z'),
    );

    expect(emailNotificationService.enqueueTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'appointment.rescheduled',
        idempotencyKey: `appointment-rescheduled-appt-1-${appointment.startAt.toISOString()}`,
        variables: expect.objectContaining({
          'appointment.previous_start_at': expect.any(String),
        }),
      }),
    );
  });

  it('enqueues appointment.reminder with offset in idempotency key', async () => {
    const { service, emailNotificationService } = createService();

    await service.sendReminder('biz-1', appointment as never, 24);

    expect(emailNotificationService.enqueueTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'appointment.reminder',
        idempotencyKey: 'appointment-reminder-appt-1-24h',
      }),
    );
  });
});
