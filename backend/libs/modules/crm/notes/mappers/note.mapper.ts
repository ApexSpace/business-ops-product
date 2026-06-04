import { resolveContactLabel } from '@app/modules/crm/contacts/mappers/contact.mapper';
import { NoteWithRelations } from '../repositories/note.repository';
import { NoteResponseDto } from '../dto/note-response.dto';

export function toNoteResponse(note: NoteWithRelations): NoteResponseDto {
  return {
    id: note.id,
    businessId: note.businessId,
    contactId: note.contactId,
    leadId: note.leadId,
    title: note.title,
    description: note.description,
    descriptionText: note.descriptionText,
    createdById: note.createdById,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    contact: note.contact
      ? {
          id: note.contact.id,
          label: resolveContactLabel(note.contact),
        }
      : null,
    lead: note.lead
      ? { id: note.lead.id, title: note.lead.title }
      : null,
    createdBy: note.createdBy,
  };
}
