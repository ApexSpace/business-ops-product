import type { ContextEntityType, SubjectType } from '../types/automation-registry.types';

export interface AutomationDomainEventPayload {
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
}

export interface AuditLoggedEventPayload {
  actorUserId: string;
  businessId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface CustomValueResolveInput {
  businessId: string;
  contactId?: string;
  appointmentId?: string;
  leadId?: string;
  invoiceId?: string;
  estimateId?: string;
  paymentId?: string;
  taskId?: string;
  workItemId?: string;
  conversationId?: string;
  calendarId?: string;
  serviceId?: string;
  formId?: string;
  submissionId?: string;
  userId?: string;
}

export type CustomValueResolveResult = Record<string, string>;
