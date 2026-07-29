import { buildAutomationDomainEventPayload } from './audit-domain-event.builder';

const BUSINESS_ID = '11111111-1111-4111-8111-111111111111';
const CONTACT_ID = '22222222-2222-4222-8222-222222222222';
const FORM_ID = '33333333-3333-4333-8333-333333333333';
const SUBMISSION_ID = '44444444-4444-4444-8444-444444444444';
const CONVERSATION_ID = '55555555-5555-4555-8555-555555555555';

describe('buildAutomationDomainEventPayload', () => {
  const occurredAt = '2026-06-17T12:00:00.000Z';

  it('builds contact.created payload from audit log', () => {
    const payload = buildAutomationDomainEventPayload('contact.created', {
      actorUserId: 'user-1',
      businessId: BUSINESS_ID,
      action: 'contact.created',
      entityType: 'Contact',
      entityId: CONTACT_ID,
      occurredAt,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        triggerKey: 'contact.created',
        businessId: BUSINESS_ID,
        subjectId: CONTACT_ID,
        subjectType: 'contact',
        auditAction: 'contact.created',
      }),
    );
  });

  it('builds form.submitted payload with submission context', () => {
    const payload = buildAutomationDomainEventPayload('form.submitted', {
      actorUserId: 'system',
      businessId: BUSINESS_ID,
      action: 'form.submitted',
      entityType: 'FormSubmission',
      entityId: SUBMISSION_ID,
      metadata: {
        formId: FORM_ID,
        submissionId: SUBMISSION_ID,
        submittedAt: occurredAt,
      },
      occurredAt,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        triggerKey: 'form.submitted',
        businessId: BUSINESS_ID,
        subjectId: FORM_ID,
        subjectType: 'form',
        contextEntityId: SUBMISSION_ID,
        contextEntityType: 'form_submission',
      }),
    );
  });

  it('uses conversation id from metadata for message received audits', () => {
    const payload = buildAutomationDomainEventPayload(
      'conversation.message_received',
      {
        actorUserId: 'system',
        businessId: BUSINESS_ID,
        action: 'conversation.message.received',
        entityType: 'ConversationMessage',
        entityId: 'wamid.external-message-id',
        metadata: {
          conversationId: CONVERSATION_ID,
          channel: 'whatsapp',
        },
        occurredAt,
      },
    );

    expect(payload).toEqual(
      expect.objectContaining({
        triggerKey: 'conversation.message_received',
        subjectId: CONVERSATION_ID,
        subjectType: 'conversation',
        metadata: expect.objectContaining({ channel: 'whatsapp' }),
      }),
    );
  });

  it('skips contact.tag_added for tag definition audits', () => {
    const payload = buildAutomationDomainEventPayload('contact.tag_added', {
      actorUserId: 'user-1',
      businessId: BUSINESS_ID,
      action: 'contact.tag_created',
      entityType: 'Tag',
      entityId: '66666666-6666-4666-8666-666666666666',
      metadata: { name: 'VIP' },
      occurredAt,
    });

    expect(payload).toBeNull();
  });

  it('builds contact.tag_added payload when a tag is assigned to a contact', () => {
    const tagId = '77777777-7777-4777-8777-777777777777';
    const payload = buildAutomationDomainEventPayload('contact.tag_added', {
      actorUserId: 'user-1',
      businessId: BUSINESS_ID,
      action: 'contact.tag_added',
      entityType: 'Contact',
      entityId: CONTACT_ID,
      metadata: { tagId, tagName: 'VIP' },
      occurredAt,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        triggerKey: 'contact.tag_added',
        subjectId: CONTACT_ID,
        subjectType: 'contact',
        metadata: expect.objectContaining({ tagId, tagName: 'VIP' }),
      }),
    );
  });
});
