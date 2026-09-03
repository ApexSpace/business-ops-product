import { AppointmentStatus } from '@prisma/client';
import { AppointmentAutomatedMessagesService } from './appointment-automated-messages.service';

describe('AppointmentAutomatedMessagesService', () => {
  const repository = {
    ensureSettings: jest.fn(),
    updateSettings: jest.fn(),
    findTriggerById: jest.fn(),
    findMessageById: jest.fn(),
    createTrigger: jest.fn(),
    updateTrigger: jest.fn(),
    deleteTrigger: jest.fn(),
    createMessage: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
    countTriggers: jest.fn(),
    countMessages: jest.fn(),
    findByBusinessAndEvent: jest.fn(),
  };

  const auditService = {
    log: jest.fn(),
  };

  let service: AppointmentAutomatedMessagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppointmentAutomatedMessagesService(
      repository as never,
      auditService as never,
    );
  });

  it('returns BOOKED settings dto from ensure', async () => {
    repository.ensureSettings.mockResolvedValue({
      id: 's1',
      businessId: 'b1',
      eventType: 'BOOKED',
      defaultStatus: AppointmentStatus.CONFIRMED,
      triggers: [],
    });

    const result = await service.get('b1', 'BOOKED');
    expect(result.eventType).toBe('BOOKED');
    expect(result.defaultStatus).toBe(AppointmentStatus.CONFIRMED);
    expect(repository.ensureSettings).toHaveBeenCalled();
  });

  it('rejects invalid event type', async () => {
    await expect(service.get('b1', 'NOPE')).rejects.toMatchObject({
      message: 'Invalid event type',
    });
  });

  it('exposes booked catalog', () => {
    const catalog = service.getCatalog('BOOKED');
    expect(catalog.some((c) => c.notificationKey === 'appointment.confirmation')).toBe(
      true,
    );
  });

  it('rejects confirmation-request when defaultStatus is CONFIRMED', async () => {
    repository.findTriggerById.mockResolvedValue({
      id: 't1',
      kind: 'BEFORE_START',
      offsetValue: 2,
      offsetUnit: 'DAYS',
      settings: {
        businessId: 'b1',
        eventType: 'BOOKED',
        defaultStatus: AppointmentStatus.CONFIRMED,
      },
    });

    await expect(
      service.createMessage(
        'b1',
        't1',
        {
          sourceScope: 'ALL',
          channel: 'EMAIL',
          notificationKey: 'appointment.confirmation_request',
        } as never,
        { id: 'u1' } as never,
      ),
    ).rejects.toMatchObject({
      message:
        'Confirmation-request messages require defaultStatus UNCONFIRMED',
    });
  });

  it('rejects confirmation-request on same-day offsets', async () => {
    repository.findTriggerById.mockResolvedValue({
      id: 't1',
      kind: 'BEFORE_START',
      offsetValue: 3,
      offsetUnit: 'HOURS',
      settings: {
        businessId: 'b1',
        eventType: 'BOOKED',
        defaultStatus: AppointmentStatus.UNCONFIRMED,
      },
    });

    await expect(
      service.createMessage(
        'b1',
        't1',
        {
          sourceScope: 'ALL',
          channel: 'EMAIL',
          notificationKey: 'appointment.confirmation_request',
        } as never,
        { id: 'u1' } as never,
      ),
    ).rejects.toMatchObject({
      message:
        'Confirmation-request messages cannot be sent less than 24 hours before the appointment',
    });
  });

  it('blocks deleting the IMMEDIATE trigger', async () => {
    repository.findTriggerById.mockResolvedValue({
      id: 't1',
      kind: 'IMMEDIATE',
      settings: { businessId: 'b1', eventType: 'BOOKED' },
    });

    await expect(
      service.deleteTrigger('b1', 't1', { id: 'u1' } as never),
    ).rejects.toMatchObject({
      message: 'Cannot delete the IMMEDIATE trigger',
    });
  });
});
