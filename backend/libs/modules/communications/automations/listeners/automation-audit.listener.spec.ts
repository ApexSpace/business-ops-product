import { AutomationAuditListener } from '../listeners/automation-audit.listener';
import { DomainEventBusService } from '../services/domain-event-bus.service';

describe('AutomationAuditListener', () => {
  const domainEventBus = {
    publish: jest.fn().mockReturnValue(true),
  };
  const listener = new AutomationAuditListener(
    domainEventBus as unknown as DomainEventBusService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps contact.created audit to automation domain event', () => {
    listener.handleAuditLogged({
      actorUserId: 'user-1',
      businessId: '11111111-1111-4111-8111-111111111111',
      action: 'contact.created',
      entityType: 'Contact',
      entityId: '22222222-2222-4222-8222-222222222222',
      occurredAt: '2026-06-17T12:00:00.000Z',
    });

    expect(domainEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerKey: 'contact.created',
        businessId: '11111111-1111-4111-8111-111111111111',
        subjectId: '22222222-2222-4222-8222-222222222222',
        subjectType: 'contact',
      }),
    );
  });

  it('maps form.submitted audit to automation domain event', () => {
    listener.handleAuditLogged({
      actorUserId: 'system',
      businessId: '11111111-1111-4111-8111-111111111111',
      action: 'form.submitted',
      entityType: 'FormSubmission',
      entityId: '44444444-4444-4444-8444-444444444444',
      metadata: {
        formId: '33333333-3333-4333-8333-333333333333',
        submissionId: '44444444-4444-4444-8444-444444444444',
      },
      occurredAt: '2026-06-17T12:00:00.000Z',
    });

    expect(domainEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerKey: 'form.submitted',
        subjectId: '33333333-3333-4333-8333-333333333333',
        contextEntityId: '44444444-4444-4444-8444-444444444444',
      }),
    );
  });

  it('ignores audits without business scope', () => {
    listener.handleAuditLogged({
      actorUserId: 'user-1',
      action: 'platform.settings.updated',
      entityType: 'PlatformSettings',
      entityId: 'settings-1',
      occurredAt: '2026-06-17T12:00:00.000Z',
    });

    expect(domainEventBus.publish).not.toHaveBeenCalled();
  });
});
