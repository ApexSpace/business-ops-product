import { formatPhone } from '../../contacts/utils/contact-profile.util';
import { LeadWithRelations } from '../repositories/lead.repository';
import { LeadResponseDto } from '../dto/lead-response.dto';

export function toLeadResponse(lead: LeadWithRelations): LeadResponseDto {
  const contact = lead.contact
    ? {
        ...lead.contact,
        phone: formatPhone(
          lead.contact.phoneCountryCode,
          lead.contact.phoneNumber,
        ),
      }
    : null;

  return {
    id: lead.id,
    businessId: lead.businessId,
    contactId: lead.contactId,
    serviceId: lead.serviceId,
    pipelineId: lead.pipelineId,
    pipelineStageId: lead.pipelineStageId,
    assignedToId: lead.assignedToId,
    title: lead.title,
    value: lead.value?.toString() ?? null,
    status: lead.status,
    source: lead.source,
    notes: lead.notes,
    createdById: lead.createdById,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    contact,
    service: lead.service
      ? {
          ...lead.service,
          price: lead.service.price?.toString() ?? null,
        }
      : null,
    pipeline: lead.pipeline,
    pipelineStage: lead.pipelineStage,
    assignedTo: lead.assignedTo,
  };
}
