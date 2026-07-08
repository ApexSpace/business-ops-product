import { AppointmentResponseDto } from '../dto/appointment.dto';
import { AppointmentWithRelations } from '../repositories/appointment.repository';

function decimalToString(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

export function toAppointmentResponse(
  row: AppointmentWithRelations,
  options?: { googleSyncWarning?: string | null },
): AppointmentResponseDto {
  const checkout = row.invoices?.[0] ?? null;
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
    services: row.serviceLines.map((line) => ({
      id: line.id,
      serviceId: line.serviceId,
      assignedToId: line.assignedToId,
      startAt: line.startAt,
      durationMinutes: line.durationMinutes,
      price: decimalToString(line.price),
      sortOrder: line.sortOrder,
      service: {
        id: line.service.id,
        name: line.service.name,
        durationMinutes: line.service.durationMinutes,
        price: decimalToString(line.service.price),
      },
      assignedTo: line.assignedTo,
    })),
    assignedTo: row.assignedTo,
    createdBy: row.createdBy,
    relatedCheckoutId: checkout?.id ?? null,
    ...(options?.googleSyncWarning
      ? { googleSyncWarning: options.googleSyncWarning }
      : {}),
  };
}
