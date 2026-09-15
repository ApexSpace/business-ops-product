import { TRIGGER_BY_KEY } from '../registries/trigger.registry';
import { DomainEventBusService } from './domain-event-bus.service';

describe('DomainEventBusService', () => {
  const eventPublisher = { publish: jest.fn() };
  const service = new DomainEventBusService(eventPublisher as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes validated automation domain events', () => {
    const businessId = '11111111-1111-4111-8111-111111111111';
    const subjectId = '22222222-2222-4222-8222-222222222222';

    const published = service.publish({
      triggerKey: 'contact.created',
      businessId,
      subjectId,
      subjectType: 'contact',
      auditAction: 'contact.created',
      auditEntityType: 'Contact',
      auditEntityId: subjectId,
      occurredAt: new Date().toISOString(),
    });

    expect(published).toBe(true);
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'automation.domain-event',
      expect.objectContaining({
        businessId,
        subjectId,
        subjectType: 'contact',
      }),
    );
  });

  it('rejects payloads that fail trigger schema validation', () => {
    const published = service.publish({
      triggerKey: 'contact.created',
      businessId: 'not-a-uuid',
      subjectId: '22222222-2222-4222-8222-222222222222',
      subjectType: 'contact',
      auditAction: 'contact.created',
      auditEntityType: 'Contact',
      auditEntityId: '22222222-2222-4222-8222-222222222222',
      occurredAt: new Date().toISOString(),
    });

    expect(published).toBe(false);
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('validates form.submitted fixture against registry schema', () => {
    const trigger = TRIGGER_BY_KEY['form.submitted'];
    const payload = {
      businessId: '11111111-1111-4111-8111-111111111111',
      subjectId: '33333333-3333-4333-8333-333333333333',
      subjectType: 'form',
      contextEntityId: '44444444-4444-4444-8444-444444444444',
      contextEntityType: 'form_submission',
      metadata: {
        formId: '33333333-3333-4333-8333-333333333333',
        submissionId: '44444444-4444-4444-8444-444444444444',
      },
    };

    expect(trigger.payloadSchema.safeParse(payload).success).toBe(true);
  });
});
