import { Injectable } from '@nestjs/common';
import {
  Calendar,
  CalendarAvailability,
  CalendarException,
  CalendarStaff,
  CalendarStatus,
  DayOfWeek,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type CalendarWithCounts = Calendar & {
  _count: { staff: number; appointments: number };
};

@Injectable()
export class CalendarRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.CalendarWhereInput,
  ): Prisma.CalendarWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  create(
    businessId: string,
    data: Omit<Prisma.CalendarUncheckedCreateInput, 'businessId'>,
  ): Promise<Calendar> {
    return this.prisma.calendar.create({
      data: { businessId, ...data },
    });
  }

  findById(businessId: string, id: string): Promise<Calendar | null> {
    return this.prisma.calendar.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findByIdWithRelations(
    businessId: string,
    id: string,
  ): Promise<
    | (Calendar & {
        staff: (CalendarStaff & {
          user: { id: string; firstName: string | null; lastName: string | null; email: string };
        })[];
        availability: CalendarAvailability[];
        exceptions: CalendarException[];
      })
    | null
  > {
    return this.prisma.calendar.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: {
        staff: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        availability: { orderBy: { dayOfWeek: 'asc' } },
        exceptions: { orderBy: { date: 'asc' } },
      },
    });
  }

  async findMany(
    businessId: string,
    options: {
      skip: number;
      take: number;
      search?: string;
      status?: CalendarStatus;
    },
  ): Promise<{ items: CalendarWithCounts[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(options.status ? { status: options.status } : {}),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { description: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    });

    const [items, total] = await Promise.all([
      this.prisma.calendar.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              staff: true,
              appointments: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.prisma.calendar.count({ where }),
    ]);

    return { items, total };
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.CalendarUpdateInput,
  ): Promise<Calendar> {
    return this.prisma.calendar.update({
      where: { id },
      data,
    });
  }

  softDelete(businessId: string, id: string): Promise<Calendar> {
    return this.prisma.calendar.update({
      where: { id },
      data: { deletedAt: new Date(), status: CalendarStatus.INACTIVE },
    });
  }

  replaceAvailability(
    businessId: string,
    calendarId: string,
    slots: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      isEnabled: boolean;
    }>,
  ): Promise<CalendarAvailability[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.calendarAvailability.deleteMany({
        where: { calendarId, businessId },
      });
      if (slots.length === 0) return [];
      await tx.calendarAvailability.createMany({
        data: slots.map((slot) => ({
          businessId,
          calendarId,
          ...slot,
        })),
      });
      return tx.calendarAvailability.findMany({
        where: { calendarId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  listStaff(calendarId: string, businessId: string) {
    return this.prisma.calendarStaff.findMany({
      where: { calendarId, businessId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  addStaff(data: Prisma.CalendarStaffUncheckedCreateInput) {
    return this.prisma.calendarStaff.create({
      data,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  removeStaff(calendarId: string, userId: string) {
    return this.prisma.calendarStaff.delete({
      where: { calendarId_userId: { calendarId, userId } },
    });
  }

  clearPrimaryStaff(calendarId: string, excludeUserId?: string) {
    return this.prisma.calendarStaff.updateMany({
      where: {
        calendarId,
        isPrimary: true,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      data: { isPrimary: false },
    });
  }

  setPrimaryStaff(calendarId: string, userId: string) {
    return this.prisma.calendarStaff.update({
      where: { calendarId_userId: { calendarId, userId } },
      data: { isPrimary: true },
    });
  }

  listExceptions(calendarId: string, businessId: string) {
    return this.prisma.calendarException.findMany({
      where: { calendarId, businessId },
      orderBy: { date: 'asc' },
    });
  }

  createException(data: Prisma.CalendarExceptionUncheckedCreateInput) {
    return this.prisma.calendarException.create({ data });
  }

  findException(
    businessId: string,
    calendarId: string,
    exceptionId: string,
  ) {
    return this.prisma.calendarException.findFirst({
      where: { id: exceptionId, businessId, calendarId },
    });
  }

  updateException(id: string, data: Prisma.CalendarExceptionUpdateInput) {
    return this.prisma.calendarException.update({ where: { id }, data });
  }

  deleteException(id: string) {
    return this.prisma.calendarException.delete({ where: { id } });
  }
}
