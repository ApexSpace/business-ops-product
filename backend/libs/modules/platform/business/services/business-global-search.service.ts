import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  GlobalSearchResponseDto,
  GlobalSearchResultDto,
} from '../dto/global-search-response.dto';

@Injectable()
export class BusinessGlobalSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    businessId: string,
    query: string,
    limit = 20,
  ): Promise<GlobalSearchResponseDto> {
    const term = query.trim();
    if (!term) {
      return { items: [] };
    }

    const perType = Math.max(3, Math.ceil(limit / 4));
    const contains = { contains: term, mode: 'insensitive' as const };

    const [contacts, appointments, invoices, products] = await Promise.all([
      this.prisma.contact.findMany({
        where: {
          businessId,
          deletedAt: null,
          OR: [
            { displayName: contains },
            { firstName: contains },
            { lastName: contains },
            { email: contains },
            { phoneNumber: contains },
            { companyName: contains },
          ],
        },
        take: perType,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      }),
      this.prisma.appointment.findMany({
        where: {
          businessId,
          deletedAt: null,
          OR: [{ title: contains }],
        },
        take: perType,
        orderBy: { startAt: 'asc' },
        select: {
          id: true,
          title: true,
          startAt: true,
          contact: {
            select: {
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          businessId,
          deletedAt: null,
          OR: [{ invoiceNumber: contains }],
        },
        take: perType,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          contact: {
            select: {
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.product.findMany({
        where: {
          businessId,
          deletedAt: null,
          OR: [{ name: contains }, { sku: contains }, { barcode: contains }],
        },
        take: perType,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          sku: true,
        },
      }),
    ]);

    const items: GlobalSearchResultDto[] = [
      ...contacts.map((row) => ({
        id: row.id,
        type: 'contact' as const,
        label: this.contactLabel(row),
        subtitle: row.email ?? undefined,
        href: `/business/contacts/${row.id}`,
      })),
      ...appointments.map((row) => ({
        id: row.id,
        type: 'appointment' as const,
        label: row.title,
        subtitle: this.contactLabel(row.contact),
        href: `/business/appointments?appointmentId=${row.id}`,
      })),
      ...invoices.map((row) => ({
        id: row.id,
        type: 'invoice' as const,
        label: row.invoiceNumber,
        subtitle: this.contactLabel(row.contact),
        href: `/business/payments?tab=invoices&invoiceId=${row.id}`,
      })),
      ...products.map((row) => ({
        id: row.id,
        type: 'product' as const,
        label: row.name,
        subtitle: row.sku ?? undefined,
        href: `/business/products?productId=${row.id}`,
      })),
    ];

    return { items: items.slice(0, limit) };
  }

  private contactLabel(contact: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }): string {
    return (
      contact.displayName ??
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ??
      'Contact'
    );
  }
}
