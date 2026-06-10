import { resolveContactLabel } from '@app/modules/crm/contacts/mappers/contact.mapper';
import { TaskWithRelations } from '../repositories/task.repository';
import { TaskResponseDto } from '../dto/task-response.dto';

export function toTaskResponse(task: TaskWithRelations): TaskResponseDto {
  return {
    id: task.id,
    businessId: task.businessId,
    contactId: task.contactId,
    leadId: task.leadId,
    title: task.title,
    description: task.description,
    descriptionText: task.descriptionText,
    dueAt: task.dueAt,
    status: task.status,
    priority: task.priority,
    assignedToId: task.assignedToId,
    createdById: task.createdById,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    contact: task.contact
      ? {
          id: task.contact.id,
          label: resolveContactLabel(task.contact),
        }
      : null,
    lead: task.lead ? { id: task.lead.id, title: task.lead.title } : null,
    assignedTo: task.assignedTo,
    createdBy: task.createdBy,
  };
}
