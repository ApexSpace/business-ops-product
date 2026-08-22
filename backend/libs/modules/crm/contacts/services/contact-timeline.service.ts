import { HttpStatus, Injectable } from '@nestjs/common';
import { InvoiceKind, PaymentStatus, type PaymentMethod } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { ContactRepository } from '../repositories/contact.repository';
import {
  CONTACT_TIMELINE_TYPES,
  ContactTimelineQueryDto,
  type ContactTimelineType,
} from '../dto/contact-timeline-query.dto';
import { ContactTimelineEventDto } from '../dto/contact-timeline-response.dto';

const ALL_TYPES = new Set<string>(CONTACT_TIMELINE_TYPES);

function formatPersonName(
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
): string | null {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email?.trim() || null;
}

function formatMoney(value: { toString(): string } | string | number): string {
  const num = Number(value.toString());
  if (!Number.isFinite(num)) return `$${value.toString()}`;
  return `$${num.toFixed(2)}`;
}

function formatPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case 'CASH':
      return 'cash';
    case 'CARD':
      return 'card';
    case 'BANK_TRANSFER':
      return 'bank transfer';
    case 'WALLET':
      return 'wallet';
    case 'GIFT_CARD':
      return 'gift card';
    case 'STRIPE':
      return 'card';
    default:
      return method.toLowerCase().replace(/_/g, ' ');
  }
}

function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return hours === 1 ? '1 hr' : `${hours} hr`;
  return `${minutes} min`;
}

function formatClockTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

@Injectable()
export class ContactTimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactRepository: ContactRepository,
  ) {}

  async getTimeline(
    businessId: string,
    contactId: string,
    query: ContactTimelineQueryDto,
  ): Promise<{
    items: ContactTimelineEventDto[];
    meta: { total: number; page: number; limit: number };
  }> {
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

    const types = this.resolveTypes(query.types);
    const events: ContactTimelineEventDto[] = [];

    if (types.has('contact_created')) {
      events.push({
        id: `contact-${contact.id}-created`,
        type: 'contact_created',
        title: 'Client Created',
        description: `Created by system`,
        occurredAt: contact.createdAt,
        entityType: 'Contact',
        entityId: contact.id,
      });
    }

    const fetches: Promise<void>[] = [];

    if (types.has('appointment')) {
      fetches.push(
        this.prisma.appointment
          .findMany({
            where: {
              businessId,
              contactId,
              deletedAt: null,
            },
            include: {
              service: { select: { name: true } },
              assignedTo: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
            orderBy: { startAt: 'desc' },
            take: 200,
          })
          .then((rows) => {
            for (const row of rows) {
              const staffName = formatPersonName(row.assignedTo);
              const durationMs =
                row.endAt.getTime() - row.startAt.getTime();
              const durationLabel = formatDurationMinutes(
                Math.max(0, Math.round(durationMs / 60_000)),
              );
              const timeLabel = formatClockTime(row.startAt);
              const metadata = row.metadata as Record<string, unknown> | null;
              const requested =
                metadata?.requestedStaff === true ||
                metadata?.preferredStaff === true ||
                metadata?.requestedThisPerson === true;
              events.push({
                id: `appointment-${row.id}`,
                type: 'appointment',
                title: row.service?.name?.trim() || row.title,
                description: [
                  staffName ? `with ${staffName}` : null,
                  row.status.toLowerCase().replace(/_/g, ' '),
                ]
                  .filter(Boolean)
                  .join(' · '),
                occurredAt: row.startAt,
                entityType: 'Appointment',
                entityId: row.id,
                subtitle: staffName ? `with ${staffName}` : null,
                footer: [timeLabel, durationLabel].filter(Boolean).join(' · '),
                requested,
              });
            }
          }),
      );
    }

    if (types.has('note')) {
      fetches.push(
        this.prisma.note
          .findMany({
            where: {
              businessId,
              contactId,
              deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
          .then((rows) => {
            for (const row of rows) {
              events.push({
                id: `note-${row.id}`,
                type: 'note',
                title: row.title,
                description: row.descriptionText ?? undefined,
                occurredAt: row.createdAt,
                entityType: 'Note',
                entityId: row.id,
              });
            }
          }),
      );
    }

    if (types.has('sale')) {
      fetches.push(
        this.prisma.payment
          .findMany({
            where: {
              businessId,
              contactId,
              invoice: { kind: InvoiceKind.CHECKOUT, deletedAt: null },
            },
            include: {
              invoice: {
                select: {
                  displaySequence: true,
                  invoiceNumber: true,
                  kind: true,
                },
              },
            },
            orderBy: { paidAt: 'desc' },
            take: 200,
          })
          .then((rows) => {
            for (const row of rows) {
              const saleLabel =
                row.invoice?.displaySequence != null
                  ? `Sale #${row.invoice.displaySequence}`
                  : row.invoice?.invoiceNumber;
              events.push({
                id: `payment-${row.id}`,
                type: 'sale',
                title: 'Payment received',
                description: [saleLabel, row.amount.toString()]
                  .filter(Boolean)
                  .join(' · '),
                occurredAt: row.paidAt ?? row.createdAt,
                entityType: 'Payment',
                entityId: row.id,
              });
            }
          }),
      );

      fetches.push(
        this.prisma.invoice
          .findMany({
            where: {
              businessId,
              contactId,
              kind: InvoiceKind.CHECKOUT,
              deletedAt: null,
            },
            include: {
              items: {
                orderBy: { sortOrder: 'asc' },
                take: 3,
                select: {
                  title: true,
                  totalPrice: true,
                  staffUser: {
                    select: { firstName: true, lastName: true, email: true },
                  },
                },
              },
              payments: {
                where: { deletedAt: null, status: PaymentStatus.SUCCEEDED },
                orderBy: { paidAt: 'desc' },
                take: 3,
                select: { method: true, amount: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
          .then((rows) => {
            for (const row of rows) {
              const saleNumber =
                row.displaySequence != null
                  ? `Sale #${row.displaySequence}`
                  : row.invoiceNumber;
              const firstItem = row.items[0];
              const staffName = formatPersonName(firstItem?.staffUser);
              const lineTitle = firstItem
                ? staffName
                  ? `${firstItem.title} — with ${staffName}`
                  : firstItem.title
                : null;
              const total = formatMoney(row.totalAmount);
              const subtotal = formatMoney(row.subtotal);
              const payment = row.payments[0];
              const paymentSummary = payment
                ? `Paid with ${formatPaymentMethod(payment.method)} — ${formatMoney(payment.amount)}`
                : row.paymentStatus === 'PAID' || row.status === 'PAID'
                  ? `Paid — ${total}`
                  : null;
              const isClosed =
                row.closedAt != null ||
                row.status === 'PAID' ||
                row.paymentStatus === 'PAID';
              const statusCode = isClosed ? 'closed' : row.status.toLowerCase();
              events.push({
                id: `checkout-${row.id}`,
                type: 'sale',
                title: saleNumber,
                description: [statusCode, total].filter(Boolean).join(' · '),
                occurredAt: row.issueDate,
                entityType: 'Invoice',
                entityId: row.id,
                lineTitle,
                amount: firstItem ? formatMoney(firstItem.totalPrice) : total,
                subtotal,
                total,
                paymentSummary,
                statusCode,
              });
            }
          }),
      );
    }

    if (types.has('form')) {
      fetches.push(
        this.prisma.formSubmission
          .findMany({
            where: { businessId },
            include: { form: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 300,
          })
          .then((rows) => {
            for (const row of rows) {
              const metadata = row.metadata as Record<string, unknown> | null;
              const linkedContactId =
                typeof metadata?.contactId === 'string'
                  ? metadata.contactId
                  : null;
              if (linkedContactId !== contactId) continue;
              events.push({
                id: `form-${row.id}`,
                type: 'form',
                title: `Form submitted`,
                description: row.form.name,
                occurredAt: row.createdAt,
                entityType: 'FormSubmission',
                entityId: row.id,
              });
            }
          }),
      );
    }

    if (types.has('lead')) {
      fetches.push(
        this.prisma.lead
          .findMany({
            where: { businessId, contactId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
          .then((rows) => {
            for (const row of rows) {
              events.push({
                id: `lead-${row.id}`,
                type: 'lead',
                title: row.title ?? 'Lead',
                description: row.status.toLowerCase(),
                occurredAt: row.createdAt,
                entityType: 'Lead',
                entityId: row.id,
              });
            }
          }),
      );
    }

    if (types.has('work_item')) {
      fetches.push(
        this.prisma.workItem
          .findMany({
            where: { businessId, contactId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
          .then((rows) => {
            for (const row of rows) {
              events.push({
                id: `work-item-${row.id}`,
                type: 'work_item',
                title: row.title,
                description: row.status.toLowerCase().replace(/_/g, ' '),
                occurredAt: row.createdAt,
                entityType: 'WorkItem',
                entityId: row.id,
              });
            }
          }),
      );
    }

    if (types.has('task')) {
      fetches.push(
        this.prisma.task
          .findMany({
            where: { businessId, contactId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
          .then((rows) => {
            for (const row of rows) {
              events.push({
                id: `task-${row.id}`,
                type: 'task',
                title: row.title,
                description: row.status.toLowerCase().replace(/_/g, ' '),
                occurredAt: row.createdAt,
                entityType: 'Task',
                entityId: row.id,
              });
            }
          }),
      );
    }

    await Promise.all(fetches);

    events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const { page, limit, skip, take } = getPaginationParams(query);
    const total = events.length;
    const items = events.slice(skip, skip + take);

    return { items, meta: { total, page, limit } };
  }

  private resolveTypes(types?: ContactTimelineType[]): Set<string> {
    if (!types?.length) return ALL_TYPES;
    return new Set(types.filter((t) => ALL_TYPES.has(t)));
  }
}
