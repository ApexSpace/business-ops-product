import type {
  ContextEntityType,
  SubjectType,
} from '../types/automation-registry.types';
import type { AuditLoggedEventPayload } from '../types/domain-event.types';
import { TRIGGER_BY_KEY } from '../registries/trigger.registry';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ENTITY_TYPE_TO_SUBJECT_TYPE: Record<string, SubjectType> = {
  Contact: 'contact',
  Lead: 'lead',
  Appointment: 'appointment',
  Calendar: 'calendar',
  Conversation: 'conversation',
  Form: 'form',
  FormSubmission: 'form',
  Estimate: 'estimate',
  Invoice: 'invoice',
  Payment: 'payment',
  Task: 'task',
  WorkItem: 'work_item',
  Note: 'note',
  Integration: 'integration',
  BusinessIntegration: 'integration',
};

type ResolvedSubject = {
  subjectId: string;
  contextEntityId?: string;
  contextEntityType?: ContextEntityType;
  metadata?: Record<string, unknown>;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function defaultMetadata(
  audit: AuditLoggedEventPayload,
): Record<string, unknown> | undefined {
  if (!audit.metadata || Object.keys(audit.metadata).length === 0) {
    return undefined;
  }
  return { ...audit.metadata };
}

function resolveByEntityType(
  audit: AuditLoggedEventPayload,
): ResolvedSubject | null {
  const subjectType = ENTITY_TYPE_TO_SUBJECT_TYPE[audit.entityType];
  if (!subjectType || !isUuid(audit.entityId)) {
    return null;
  }

  return {
    subjectId: audit.entityId,
    metadata: defaultMetadata(audit),
  };
}

const AUDIT_SUBJECT_RESOLVERS: Record<
  string,
  (audit: AuditLoggedEventPayload) => ResolvedSubject | null
> = {
  'conversation.message.received': (audit) => {
    const conversationId = asString(audit.metadata?.conversationId);
    if (!conversationId || !isUuid(conversationId)) return null;
    return {
      subjectId: conversationId,
      metadata: {
        channel: audit.metadata?.channel,
        messageId: isUuid(audit.entityId) ? audit.entityId : undefined,
      },
    };
  },
  'form.submitted': (audit) => {
    const formId = asString(audit.metadata?.formId);
    const submissionId =
      asString(audit.metadata?.submissionId) ?? audit.entityId;
    if (!formId || !isUuid(formId) || !isUuid(submissionId)) return null;
    return {
      subjectId: formId,
      contextEntityId: submissionId,
      contextEntityType: 'form_submission',
      metadata: {
        formId,
        submissionId,
        submittedAt: audit.metadata?.submittedAt,
      },
    };
  },
  'lead.created_from_contact': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    const contactId = asString(audit.metadata?.contactId);
    return {
      subjectId: audit.entityId,
      contextEntityId: contactId && isUuid(contactId) ? contactId : undefined,
      contextEntityType: contactId && isUuid(contactId) ? 'contact' : undefined,
      metadata: defaultMetadata(audit),
    };
  },
  'lead.reactivated_from_contact': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    const contactId = asString(audit.metadata?.contactId);
    return {
      subjectId: audit.entityId,
      contextEntityId: contactId && isUuid(contactId) ? contactId : undefined,
      contextEntityType: contactId && isUuid(contactId) ? 'contact' : undefined,
      metadata: defaultMetadata(audit),
    };
  },
  'lead.moved': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: {
        stageId: audit.metadata?.toStageId ?? audit.metadata?.stageId,
        previousStageId: audit.metadata?.fromStageId,
        pipelineId: audit.metadata?.pipelineId,
      },
    };
  },
  'lead.assigned': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: {
        assigneeId: audit.metadata?.assignedToId ?? audit.metadata?.assigneeId,
        previousAssigneeId: audit.metadata?.previousAssigneeId,
      },
    };
  },
  'appointment.status_changed': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: {
        status: audit.metadata?.to ?? audit.metadata?.status,
        previousStatus: audit.metadata?.from ?? audit.metadata?.previousStatus,
      },
    };
  },
  'estimate.status_changed': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: {
        status: audit.metadata?.to ?? audit.metadata?.status,
        previousStatus: audit.metadata?.from ?? audit.metadata?.previousStatus,
      },
    };
  },
  'invoice.status_changed': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: {
        status: audit.metadata?.to ?? audit.metadata?.status,
        previousStatus: audit.metadata?.from ?? audit.metadata?.previousStatus,
      },
    };
  },
  'work_item.status_changed': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: {
        status: audit.metadata?.to ?? audit.metadata?.status,
        previousStatus: audit.metadata?.from ?? audit.metadata?.previousStatus,
      },
    };
  },
  'payment.created': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    const invoiceId = asString(audit.metadata?.invoiceId);
    return {
      subjectId: audit.entityId,
      contextEntityId: invoiceId && isUuid(invoiceId) ? invoiceId : undefined,
      contextEntityType: invoiceId && isUuid(invoiceId) ? 'invoice' : undefined,
      metadata: defaultMetadata(audit),
    };
  },
  'invoice.payment.received': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: defaultMetadata(audit),
    };
  },
  'integration.connected': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: {
        provider:
          audit.metadata?.providerKey ??
          audit.metadata?.provider ??
          audit.metadata?.providerName,
      },
    };
  },
  'integration.deleted': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    return {
      subjectId: audit.entityId,
      metadata: {
        provider:
          audit.metadata?.providerKey ??
          audit.metadata?.provider ??
          audit.metadata?.providerName,
      },
    };
  },
  'contact.tag_created': (audit) => {
    if (audit.entityType === 'Tag') {
      return null;
    }
    return resolveByEntityType(audit);
  },
  'contact.tag_added': (audit) => {
    if (!isUuid(audit.entityId)) return null;
    const tagId = asString(audit.metadata?.tagId);
    return {
      subjectId: audit.entityId,
      metadata: {
        tagId,
        tagName: audit.metadata?.tagName,
      },
    };
  },
};

export function shouldPublishAutomationEvent(
  audit: AuditLoggedEventPayload,
): boolean {
  if (!audit.businessId || !isUuid(audit.businessId)) {
    return false;
  }
  if (audit.metadata?.source === 'automation') {
    return false;
  }
  return true;
}

export function buildAutomationDomainEventPayload(
  triggerKey: string,
  audit: AuditLoggedEventPayload,
): {
  triggerKey: string;
  businessId: string;
  subjectId: string;
  subjectType: SubjectType;
  contextEntityId?: string;
  contextEntityType?: ContextEntityType;
  metadata?: Record<string, unknown>;
  auditAction: string;
  auditEntityType: string;
  auditEntityId: string;
  occurredAt: string;
} | null {
  const trigger = TRIGGER_BY_KEY[triggerKey];
  if (!trigger || trigger.implementationStatus !== 'implemented') {
    return null;
  }
  if (!audit.businessId) return null;

  const resolver = AUDIT_SUBJECT_RESOLVERS[audit.action] ?? resolveByEntityType;
  const resolved = resolver(audit);
  if (!resolved || !isUuid(resolved.subjectId)) {
    return null;
  }

  if (resolved.subjectId && trigger.subjectType) {
    const mapped = ENTITY_TYPE_TO_SUBJECT_TYPE[audit.entityType];
    if (
      !AUDIT_SUBJECT_RESOLVERS[audit.action] &&
      mapped &&
      mapped !== trigger.subjectType &&
      resolved.subjectId === audit.entityId
    ) {
      return null;
    }
  }

  return {
    triggerKey,
    businessId: audit.businessId,
    subjectId: resolved.subjectId,
    subjectType: trigger.subjectType,
    contextEntityId: resolved.contextEntityId,
    contextEntityType: resolved.contextEntityType,
    metadata: resolved.metadata,
    auditAction: audit.action,
    auditEntityType: audit.entityType,
    auditEntityId: audit.entityId,
    occurredAt: audit.occurredAt,
  };
}
