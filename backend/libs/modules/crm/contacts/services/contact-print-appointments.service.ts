import { HttpStatus, Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { resolveContactLabel } from '../mappers/contact.mapper';
import { formatPhone } from '../utils/contact-profile.util';
import { ContactPrintAppointmentsResponseDto } from '../dto/contact-print-appointments-response.dto';
import { ContactRepository } from '../repositories/contact.repository';

@Injectable()
export class ContactPrintAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactRepository: ContactRepository,
  ) {}

  async getPrintableAppointments(
    businessId: string,
    contactId: string,
  ): Promise<ContactPrintAppointmentsResponseDto> {
    const contact = await this.contactRepository.findById(
      businessId,
      contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { name: true },
    });

    const now = new Date();
    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        contactId,
        deletedAt: null,
        startAt: { gte: now },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
      },
      include: {
        service: { select: { name: true } },
        calendar: { select: { name: true } },
        assignedTo: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    return {
      businessName: business?.name ?? 'Business',
      contactLabel: resolveContactLabel(contact),
      contactPhone: formatPhone(contact.phoneCountryCode, contact.phoneNumber),
      contactEmail: contact.email,
      generatedAt: new Date(),
      appointments: appointments.map((row) => ({
        id: row.id,
        title: row.title,
        startAt: row.startAt,
        endAt: row.endAt,
        status: row.status,
        serviceName: row.service?.name ?? null,
        calendarName: row.calendar?.name ?? null,
        providerName: row.assignedTo
          ? [row.assignedTo.firstName, row.assignedTo.lastName]
              .filter(Boolean)
              .join(' ') || row.assignedTo.email
          : null,
      })),
    };
  }
}
