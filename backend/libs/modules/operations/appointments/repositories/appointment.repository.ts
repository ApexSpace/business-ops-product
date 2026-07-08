import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.UNCONFIRMED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.WAITING,
  AppointmentStatus.IN_SERVICE,
];

const userSummarySelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

export type AppointmentServiceLineWithRelations =
  Prisma.AppointmentServiceLineGetPayload<{
    include: {
      service: {
        select: {
          id: true;
          name: true;
          durationMinutes: true;
          price: true;
        };
      };
      assignedTo: { select: typeof userSummarySelect };
    };
  }>;

export type AppointmentWithRelations = Appointment & {
  calendar: { id: string; name: string; color: string | null };
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    createdAt: Date;
  };
  service: { id: string; name: string } | null;
  serviceLines: AppointmentServiceLineWithRelations[];
  assignedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  invoices: Array<{ id: string; kind: string; status: string }>;
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
    serviceLines?: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[],
  ): Promise<AppointmentWithRelations> {
    return this.prisma.appointment.create({
      data: {
        businessId,
        ...data,
        ...(serviceLines?.length
          ? {
              serviceLines: {
                create: serviceLines,
              },
            }
          : {}),
      },
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
      statuses?: AppointmentStatus[];
      startFrom?: Date;
      startTo?: Date;
      search?: string;
    },
  ): Promise<{ items: AppointmentWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(options.calendarId ? { calendarId: options.calendarId } : {}),
      ...(options.contactId ? { contactId: options.contactId } : {}),
      ...(options.serviceId
        ? {
            OR: [
              { serviceId: options.serviceId },
              {
                serviceLines: {
                  some: { serviceId: options.serviceId },
                },
              },
            ],
          }
        : {}),
      ...(options.workItemId ? { workItemId: options.workItemId } : {}),
      ...(options.assignedToId ? { assignedToId: options.assignedToId } : {}),
      ...(options.statuses?.length ? { status: { in: options.statuses } } : {}),
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
    serviceLines?: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[],
  ): Promise<AppointmentWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      if (serviceLines !== undefined) {
        await tx.appointmentServiceLine.deleteMany({ where: { appointmentId: id } });
        if (serviceLines.length > 0) {
          await tx.appointmentServiceLine.createMany({
            data: serviceLines.map((line) => ({
              appointmentId: id,
              ...line,
            })),
          });
        }
      }
      return tx.appointment.update({
        where: { id },
        data,
        include: this.includeRelations(),
      });
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
          phoneNumber: true,
          createdAt: true,
        },
      },
      service: { select: { id: true, name: true } },
      serviceLines: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
            },
          },
          assignedTo: { select: userSummarySelect },
        },
      },
      assignedTo: { select: userSummarySelect },
      createdBy: { select: userSummarySelect },
      invoices: {
        where: { deletedAt: null, kind: 'CHECKOUT' },
        select: { id: true, kind: true, status: true },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
    } satisfies Prisma.AppointmentInclude;
  }
}
