import { formatPhone } from '@app/modules/crm/contacts/utils/contact-profile.util';
import { resolveContactLabel } from '@app/modules/crm/contacts/mappers/contact.mapper';
import { WorkItemWithRelations } from '../repositories/work-item.repository';
import { WorkItemResponseDto } from '../dto/work-item-response.dto';

export function toWorkItemResponse(
  workItem: WorkItemWithRelations,
): WorkItemResponseDto {
  const contact = workItem.contact
    ? {
        ...workItem.contact,
        phone: formatPhone(
          workItem.contact.phoneCountryCode,
          workItem.contact.phoneNumber,
        ),
        label: resolveContactLabel(workItem.contact),
      }
    : undefined;

  return {
    id: workItem.id,
    businessId: workItem.businessId,
    contactId: workItem.contactId,
    serviceId: workItem.serviceId,
    leadId: workItem.leadId,
    title: workItem.title,
    type: workItem.type,
    status: workItem.status,
    description: workItem.description,
    scheduledAt: workItem.scheduledAt,
    startedAt: workItem.startedAt,
    completedAt: workItem.completedAt,
    amount: workItem.amount?.toString() ?? null,
    assignedToId: workItem.assignedToId,
    createdById: workItem.createdById,
    createdAt: workItem.createdAt,
    updatedAt: workItem.updatedAt,
    contact,
    service: workItem.service
      ? {
          ...workItem.service,
          price: workItem.service.price?.toString() ?? null,
        }
      : null,
    assignedTo: workItem.assignedTo,
  };
}
