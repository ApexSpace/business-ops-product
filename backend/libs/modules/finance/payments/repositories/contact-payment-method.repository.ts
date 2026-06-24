import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ContactPaymentMethodRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(businessId: string, contactId: string) {
    return {
      businessId,
      contactId,
      deletedAt: null,
    };
  }

  findManyForContact(businessId: string, contactId: string) {
    return this.prisma.contactPaymentMethod.findMany({
      where: this.activeWhere(businessId, contactId),
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(businessId: string, contactId: string, id: string) {
    return this.prisma.contactPaymentMethod.findFirst({
      where: { ...this.activeWhere(businessId, contactId), id },
    });
  }

  findByStripePaymentMethodId(
    businessId: string,
    stripePaymentMethodId: string,
  ) {
    return this.prisma.contactPaymentMethod.findFirst({
      where: { businessId, stripePaymentMethodId, deletedAt: null },
    });
  }

  async clearDefaultForContact(businessId: string, contactId: string) {
    await this.prisma.contactPaymentMethod.updateMany({
      where: this.activeWhere(businessId, contactId),
      data: { isDefault: false },
    });
  }

  create(data: {
    businessId: string;
    contactId: string;
    stripeCustomerId: string;
    stripePaymentMethodId: string;
    brand?: string | null;
    last4?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
    isDefault?: boolean;
  }) {
    return this.prisma.contactPaymentMethod.create({ data });
  }

  async softDelete(id: string) {
    return this.prisma.contactPaymentMethod.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });
  }
}
