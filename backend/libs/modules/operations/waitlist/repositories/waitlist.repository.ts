import { Injectable } from '@nestjs/common';
import {
  BookingWaitlistEntry,
  BookingWaitlistSource,
  BookingWaitlistStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const entryInclude = {
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneCountryCode: true,
      phoneNumber: true,
    },
  },
  service: {
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      price: true,
    },
  },
  staff: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  calendar: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.BookingWaitlistEntryInclude;

export type WaitlistEntryWithRelations = Prisma.BookingWaitlistEntryGetPayload<{
  include: typeof entryInclude;
}>;

@Injectable()
export class WaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.BookingWaitlistEntryWhereInput,
  ): Prisma.BookingWaitlistEntryWhereInput {
    return {
      businessId,
      ...extra,
    };
  }

  /** Entries staff actively work from the waitlist panel. */
  private openStatuses = [
    BookingWaitlistStatus.WAITING,
    BookingWaitlistStatus.MATCHED,
  ] as const;

  async create(
    data: Prisma.BookingWaitlistEntryUncheckedCreateInput,
  ): Promise<WaitlistEntryWithRelations> {
    return this.prisma.bookingWaitlistEntry.create({
      data,
      include: entryInclude,
    });
  }

  async findById(
    businessId: string,
    id: string,
  ): Promise<WaitlistEntryWithRelations | null> {
    return this.prisma.bookingWaitlistEntry.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: entryInclude,
    });
  }

  async list(params: {
    businessId: string;
    status?: BookingWaitlistStatus[];
    staffId?: string;
    calendarId?: string;
    preferredDate?: Date;
    hasOpening?: boolean;
    skip: number;
    take: number;
  }): Promise<{ items: WaitlistEntryWithRelations[]; total: number }> {
    const statusFilter = params.hasOpening
      ? { status: BookingWaitlistStatus.MATCHED }
      : params.status?.length
        ? { status: { in: params.status } }
        : { status: { in: [...this.openStatuses] } };

    const where: Prisma.BookingWaitlistEntryWhereInput = this.activeWhere(
      params.businessId,
      {
        ...statusFilter,
        ...(params.staffId ? { staffId: params.staffId } : {}),
        ...(params.calendarId ? { calendarId: params.calendarId } : {}),
        ...(params.preferredDate
          ? { preferredDate: params.preferredDate }
          : {}),
      },
    );

    const [items, total] = await Promise.all([
      this.prisma.bookingWaitlistEntry.findMany({
        where,
        include: entryInclude,
        orderBy: [{ preferredDate: 'asc' }, { createdAt: 'asc' }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.bookingWaitlistEntry.count({ where }),
    ]);

    return { items, total };
  }

  async findWaitingForRecheck(params: {
    businessId: string;
    staffId?: string;
    preferredDate?: Date;
  }): Promise<WaitlistEntryWithRelations[]> {
    const staffFilter: Prisma.BookingWaitlistEntryWhereInput = params.staffId
      ? {
          OR: [{ staffId: params.staffId }, { staffId: null }],
        }
      : {};

    return this.prisma.bookingWaitlistEntry.findMany({
      where: this.activeWhere(params.businessId, {
        status: {
          in: [BookingWaitlistStatus.WAITING, BookingWaitlistStatus.MATCHED],
        },
        ...(params.preferredDate
          ? { preferredDate: params.preferredDate }
          : {}),
        ...staffFilter,
      }),
      include: entryInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(
    id: string,
    data: Prisma.BookingWaitlistEntryUpdateInput,
  ): Promise<WaitlistEntryWithRelations> {
    return this.prisma.bookingWaitlistEntry.update({
      where: { id },
      data,
      include: entryInclude,
    });
  }

  /**
   * Only updates entries still in the open pool (WAITING/MATCHED).
   * Prevents a matching race from overwriting BOOKED after staff books.
   */
  async updateIfOpen(
    id: string,
    data: Prisma.BookingWaitlistEntryUpdateInput,
  ): Promise<WaitlistEntryWithRelations | null> {
    const result = await this.prisma.bookingWaitlistEntry.updateMany({
      where: {
        id,
        status: { in: [...this.openStatuses] },
      },
      data: data as Prisma.BookingWaitlistEntryUpdateManyMutationInput,
    });
    if (result.count === 0) return null;
    return this.prisma.bookingWaitlistEntry.findFirst({
      where: { id },
      include: entryInclude,
    });
  }

  async countMatched(businessId: string): Promise<number> {
    return this.prisma.bookingWaitlistEntry.count({
      where: this.activeWhere(businessId, {
        status: BookingWaitlistStatus.MATCHED,
      }),
    });
  }

  async findDuplicate(params: {
    businessId: string;
    contactId: string;
    serviceId: string;
    preferredDate: Date;
    staffId?: string | null;
  }): Promise<BookingWaitlistEntry | null> {
    return this.prisma.bookingWaitlistEntry.findFirst({
      where: this.activeWhere(params.businessId, {
        contactId: params.contactId,
        serviceId: params.serviceId,
        preferredDate: params.preferredDate,
        staffId: params.staffId ?? null,
        status: {
          in: [BookingWaitlistStatus.WAITING, BookingWaitlistStatus.MATCHED],
        },
      }),
    });
  }
}

export { BookingWaitlistSource, BookingWaitlistStatus };
