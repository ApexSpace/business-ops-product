import type { TriggerDefinition } from '../types/automation-registry.types';
import type { AuditLoggedEventPayload } from '../types/domain-event.types';
import { AUTOMATION_TEST_IDS as ID } from '../registries/automation-test-ids.constant';

const OCCURRED_AT = '2026-06-18T12:00:00.000Z';

const SUBJECT_ENTITY_TYPE: Record<string, string> = {
  contact: 'Contact',
  lead: 'Lead',
  appointment: 'Appointment',
  calendar: 'Calendar',
  conversation: 'Conversation',
  form: 'Form',
  estimate: 'Estimate',
  invoice: 'Invoice',
  payment: 'Payment',
  task: 'Task',
  work_item: 'WorkItem',
  note: 'Note',
  integration: 'Integration',
};

const SUBJECT_ENTITY_ID: Record<string, string> = {
  contact: ID.contact,
  lead: ID.lead,
  appointment: ID.appointment,
  calendar: ID.calendar,
  conversation: ID.conversation,
  form: ID.form,
  estimate: ID.estimate,
  invoice: ID.invoice,
  payment: ID.payment,
  task: ID.task,
  work_item: ID.workItem,
  note: ID.note,
  integration: ID.integration,
};

/** Triggers fired by scheduler/cron rather than audit ingestion. */
export const SCHEDULER_ONLY_TRIGGER_KEYS = new Set([
  'appointment.before_start',
]);

const AUDIT_OVERRIDES: Record<
  string,
  Omit<AuditLoggedEventPayload, 'action' | 'businessId' | 'occurredAt'>
> = {
  'conversation.message.received': {
    actorUserId: 'system',
    entityType: 'ConversationMessage',
    entityId: 'wamid.external-message-id',
    metadata: {
      conversationId: ID.conversation,
      channel: 'email',
    },
  },
  'form.submitted': {
    actorUserId: 'system',
    entityType: 'FormSubmission',
    entityId: ID.formSubmission,
    metadata: {
      formId: ID.form,
      submissionId: ID.formSubmission,
      submittedAt: OCCURRED_AT,
    },
  },
  'contact.tag_added': {
    actorUserId: ID.user,
    entityType: 'Contact',
    entityId: ID.contact,
    metadata: { tagId: ID.tag, tagName: 'VIP' },
  },
  'lead.created_from_contact': {
    actorUserId: ID.user,
    entityType: 'Lead',
    entityId: ID.lead,
    metadata: { contactId: ID.contact },
  },
  'lead.reactivated_from_contact': {
    actorUserId: ID.user,
    entityType: 'Lead',
    entityId: ID.lead,
    metadata: { contactId: ID.contact },
  },
  'lead.moved': {
    actorUserId: ID.user,
    entityType: 'Lead',
    entityId: ID.lead,
    metadata: {
      toStageId: ID.stage,
      fromStageId: ID.pipeline,
      pipelineId: ID.pipeline,
    },
  },
  'lead.assigned': {
    actorUserId: ID.user,
    entityType: 'Lead',
    entityId: ID.lead,
    metadata: { assignedToId: ID.user },
  },
  'appointment.status_changed': {
    actorUserId: ID.user,
    entityType: 'Appointment',
    entityId: ID.appointment,
    metadata: { to: 'confirmed', from: 'scheduled' },
  },
  'estimate.status_changed': {
    actorUserId: ID.user,
    entityType: 'Estimate',
    entityId: ID.estimate,
    metadata: { to: 'sent', from: 'draft' },
  },
  'invoice.status_changed': {
    actorUserId: ID.user,
    entityType: 'Invoice',
    entityId: ID.invoice,
    metadata: { to: 'paid', from: 'sent' },
  },
  'work_item.status_changed': {
    actorUserId: ID.user,
    entityType: 'WorkItem',
    entityId: ID.workItem,
    metadata: { to: 'completed', from: 'open' },
  },
  'payment.created': {
    actorUserId: ID.user,
    entityType: 'Payment',
    entityId: ID.payment,
    metadata: { invoiceId: ID.invoice },
  },
  'invoice.payment.received': {
    actorUserId: ID.user,
    entityType: 'Invoice',
    entityId: ID.invoice,
    metadata: { amount: 100 },
  },
  'integration.connected': {
    actorUserId: ID.user,
    entityType: 'BusinessIntegration',
    entityId: ID.integration,
    metadata: { providerKey: 'stripe' },
  },
  'integration.deleted': {
    actorUserId: ID.user,
    entityType: 'BusinessIntegration',
    entityId: ID.integration,
    metadata: { providerKey: 'stripe' },
  },
  'contact.created': {
    actorUserId: ID.user,
    entityType: 'Contact',
    entityId: ID.contact,
    metadata: { hasEmail: true, hasPhone: true },
  },
};

export function buildAuditFixtureForTrigger(
  trigger: TriggerDefinition,
): AuditLoggedEventPayload | null {
  if (!trigger.auditAction || SCHEDULER_ONLY_TRIGGER_KEYS.has(trigger.key)) {
    return null;
  }

  const override = AUDIT_OVERRIDES[trigger.auditAction];
  if (override) {
    return {
      action: trigger.auditAction,
      businessId: ID.business,
      occurredAt: OCCURRED_AT,
      ...override,
    };
  }

  const entityType = SUBJECT_ENTITY_TYPE[trigger.subjectType];
  const entityId = SUBJECT_ENTITY_ID[trigger.subjectType];
  if (!entityType || !entityId) {
    return null;
  }

  return {
    actorUserId: ID.user,
    businessId: ID.business,
    action: trigger.auditAction,
    entityType,
    entityId,
    occurredAt: OCCURRED_AT,
  };
}

export function buildDomainEventPayloadForTrigger(
  trigger: TriggerDefinition,
): Record<string, unknown> | null {
  if (trigger.key === 'appointment.before_start') {
    return {
      businessId: ID.business,
      subjectId: ID.appointment,
      subjectType: 'appointment',
      contextEntityId: ID.contact,
      contextEntityType: 'contact',
      metadata: {
        offsetMinutes: 60,
        startsAt: OCCURRED_AT,
        status: 'scheduled',
        calendarId: ID.calendar,
      },
    };
  }

  const entityType = SUBJECT_ENTITY_TYPE[trigger.subjectType];
  const entityId = SUBJECT_ENTITY_ID[trigger.subjectType];
  if (!entityType || !entityId) {
    return null;
  }

  return {
    businessId: ID.business,
    subjectId: entityId,
    subjectType: trigger.subjectType,
  };
}
