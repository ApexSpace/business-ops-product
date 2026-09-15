import { Injectable } from '@nestjs/common';
import { ContactServiceAdjustment, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type ContactAdjustmentWithService = ContactServiceAdjustment & {
  service: { id: string; name: string };
};

@Injectable()
export class ContactAdjustmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(businessId: string, contactId: string) {
    return { businessId, contactId };
  }

  findMany(
    businessId: string,
    contactId: string,
  ): Promise<ContactAdjustmentWithService[]> {
    return this.prisma.contactServiceAdjustment.findMany({
      where: this.activeWhere(businessId, contactId),
      include: { service: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(
    businessId: string,
    contactId: string,
    id: string,
  ): Promise<ContactAdjustmentWithService | null> {
    return this.prisma.contactServiceAdjustment.findFirst({
      where: { ...this.activeWhere(businessId, contactId), id },
      include: { service: { select: { id: true, name: true } } },
    });
  }

  findByContactAndService(
    businessId: string,
    contactId: string,
    serviceId: string,
  ): Promise<ContactServiceAdjustment | null> {
    return this.prisma.contactServiceAdjustment.findFirst({
      where: { businessId, contactId, serviceId },
    });
  }

  create(data: {
    businessId: string;
    contactId: string;
    serviceId: string;
    durationMinutes: number;
  }): Promise<ContactAdjustmentWithService> {
    return this.prisma.contactServiceAdjustment.create({
      data,
      include: { service: { select: { id: true, name: true } } },
    });
  }

  update(
    id: string,
    data: Prisma.ContactServiceAdjustmentUpdateInput,
  ): Promise<ContactAdjustmentWithService> {
    return this.prisma.contactServiceAdjustment.update({
      where: { id },
      data,
      include: { service: { select: { id: true, name: true } } },
    });
  }

  delete(id: string): Promise<void> {
    return this.prisma.contactServiceAdjustment
      .delete({ where: { id } })
      .then(() => undefined);
  }
}
