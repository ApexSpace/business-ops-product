import { AppointmentResponseDto } from '../dto/appointment.dto';
import { AppointmentWithRelations } from '../repositories/appointment.repository';

export function toAppointmentResponse(
  row: AppointmentWithRelations,
  options?: { googleSyncWarning?: string | null },
): AppointmentResponseDto {
  return {
    id: row.id,
    businessId: row.businessId,
    calendarId: row.calendarId,
    contactId: row.contactId,
    serviceId: row.serviceId,
    workItemId: row.workItemId,
    assignedToId: row.assignedToId,
    title: row.title,
    description: row.description,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    source: row.source,
    locationType: row.locationType,
    locationValue: row.locationValue,
    notes: row.notes,
    externalProvider: row.externalProvider,
    externalEventId: row.externalEventId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    calendar: row.calendar,
    contact: row.contact,
    service: row.service,
    assignedTo: row.assignedTo,
    ...(options?.googleSyncWarning
      ? { googleSyncWarning: options.googleSyncWarning }
      : {}),
  };
}
