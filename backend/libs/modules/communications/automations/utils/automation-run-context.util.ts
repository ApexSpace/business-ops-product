import type { AutomationDomainEventPayload } from '../types/domain-event.types';
import type { AutomationRunContext } from '../types/workflow.types';
import { PrismaService } from '@app/core/database/prisma.service';

export async function resolveContactIdForEvent(
  prisma: PrismaService,
  event: AutomationDomainEventPayload,
): Promise<string | undefined> {
  if (event.subjectType === 'contact') {
    return event.subjectId;
  }

  const contactFromMeta =
    typeof event.metadata?.contactId === 'string'
      ? event.metadata.contactId
      : undefined;
  if (contactFromMeta) {
    return contactFromMeta;
  }

  const businessId = event.businessId;

  if (event.subjectType === 'lead') {
    const lead = await prisma.lead.findFirst({
      where: { id: event.subjectId, businessId, deletedAt: null },
      select: { contactId: true },
    });
    return lead?.contactId ?? undefined;
  }

  if (event.subjectType === 'appointment') {
    const appointment = await prisma.appointment.findFirst({
      where: { id: event.subjectId, businessId, deletedAt: null },
      select: { contactId: true },
    });
    return appointment?.contactId ?? undefined;
  }

  if (event.subjectType === 'conversation') {
    const conversation = await prisma.conversation.findFirst({
      where: { id: event.subjectId, businessId, deletedAt: null },
      select: { contactId: true },
    });
    return conversation?.contactId ?? undefined;
  }

  if (
    event.contextEntityType === 'form_submission' &&
    event.contextEntityId
  ) {
    const submission = await prisma.formSubmission.findFirst({
      where: { id: event.contextEntityId, businessId },
      select: { metadata: true },
    });
    const contactId =
      submission?.metadata &&
      typeof submission.metadata === 'object' &&
      typeof (submission.metadata as Record<string, unknown>).contactId ===
        'string'
        ? ((submission.metadata as Record<string, unknown>).contactId as string)
        : undefined;
    return contactId;
  }

  return undefined;
}

export function buildAutomationRunContext(params: {
  event: AutomationDomainEventPayload;
  workflowId: string;
  runId: string;
  contactId?: string;
}): AutomationRunContext {
  const { event, workflowId, runId, contactId } = params;
  const metadata = event.metadata ?? {};

  return {
    businessId: event.businessId,
    workflowId,
    runId,
    triggerKey: event.triggerKey,
    subjectId: event.subjectId,
    subjectType: event.subjectType,
    contextEntityId: event.contextEntityId,
    contextEntityType: event.contextEntityType,
    contactId,
    leadId:
      event.subjectType === 'lead'
        ? event.subjectId
        : typeof metadata.leadId === 'string'
          ? metadata.leadId
          : undefined,
    appointmentId:
      event.subjectType === 'appointment' ? event.subjectId : undefined,
    invoiceId:
      event.subjectType === 'invoice'
        ? event.subjectId
        : typeof metadata.invoiceId === 'string'
          ? metadata.invoiceId
          : undefined,
    metadata,
  };
}
