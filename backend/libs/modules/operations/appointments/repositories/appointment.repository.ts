import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';

const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];
import { PrismaService } from '@app/core/database/prisma.service';

export type AppointmentWithRelations = Appointment & {
  calendar: { id: string; name: string; color: string | null };
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string | null;
  };
  service: { id: string; name: string } | null;
  assignedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};

@Injectable()
export class AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.AppointmentWhereInput,
  ): Prisma.AppointmentWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  create(
    businessId: string,
    data: Omit<Prisma.AppointmentUncheckedCreateInput, 'businessId'>,
  ): Promise<AppointmentWithRelations> {
    return this.prisma.appointment.create({
      data: { businessId, ...data },
      include: this.includeRelations(),
    });
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<AppointmentWithRelations | null> {
    return this.prisma.appointment.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: this.includeRelations(),
    });
  }

  findByExternalEvent(
    businessId: string,
    calendarId: string,
    externalProvider: string,
    externalEventId: string,
  ): Promise<AppointmentWithRelations | null> {
    return this.prisma.appointment.findFirst({
      where: this.activeWhere(businessId, {
        calendarId,
        externalProvider,
        externalEventId,
      }),
      include: this.includeRelations(),
    });
  }

  async findMany(
    businessId: string,
    options: {
      skip: number;
      take: number;
      calendarId?: string;
      contactId?: string;
      serviceId?: string;
      workItemId?: string;
      assignedToId?: string;
      status?: AppointmentStatus;
      startFrom?: Date;
      startTo?: Date;
      search?: string;
    },
  ): Promise<{ items: AppointmentWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(options.calendarId ? { calendarId: options.calendarId } : {}),
      ...(options.contactId ? { contactId: options.contactId } : {}),
      ...(options.serviceId ? { serviceId: options.serviceId } : {}),
      ...(options.workItemId ? { workItemId: options.workItemId } : {}),
      ...(options.assignedToId ? { assignedToId: options.assignedToId } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.startFrom || options.startTo
        ? {
            startAt: {
              ...(options.startFrom ? { gte: options.startFrom } : {}),
              ...(options.startTo ? { lte: options.startTo } : {}),
            },
          }
        : {}),
      ...(options.search
        ? {
            OR: [
              { title: { contains: options.search, mode: 'insensitive' } },
              {
                description: { contains: options.search, mode: 'insensitive' },
              },
              { notes: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    });

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { startAt: 'asc' },
        include: this.includeRelations(),
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items, total };
  }

  update(
    id: string,
    data: Prisma.AppointmentUpdateInput,
  ): Promise<AppointmentWithRelations> {
    return this.prisma.appointment.update({
      where: { id },
      data,
      include: this.includeRelations(),
    });
  }

  softDelete(id: string): Promise<Appointment> {
    return this.prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findBlockingInRange(
    businessId: string,
    calendarId: string,
    rangeStart: Date,
    rangeEnd: Date,
    assignedToId?: string,
  ): Promise<Array<{ startAt: Date; endAt: Date }>> {
    return this.prisma.appointment.findMany({
      where: this.activeWhere(businessId, {
        calendarId,
        status: { in: BLOCKING_STATUSES },
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
        ...(assignedToId ? { assignedToId } : {}),
      }),
      select: { startAt: true, endAt: true },
    });
  }

  private includeRelations() {
    return {
      calendar: { select: { id: true, name: true, color: true } },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          email: true,
        },
      },
      service: { select: { id: true, name: true } },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    } satisfies Prisma.AppointmentInclude;
  }
}
