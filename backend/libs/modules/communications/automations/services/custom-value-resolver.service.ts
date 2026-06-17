import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  formatAppointmentDateTime,
  formatMoney,
  formatUserName,
} from '@app/modules/communications/email/utils/email-variables.util';
import { resolveContactLabel } from '@app/modules/crm/contacts/mappers/contact.mapper';
import { CUSTOM_VALUE_REGISTRY } from '../registries/custom-value.registry';
import type {
  CustomValueResolveInput,
  CustomValueResolveResult,
} from '../types/domain-event.types';

type LoadedEntities = {
  business?: {
    name: string;
    email: string | null;
    phone: string | null;
    timezone: string | null;
    currency: string | null;
    address: string | null;
  };
  contact?: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    email: string | null;
    phoneCountryCode: string | null;
    phoneNumber: string | null;
    source: string | null;
    tags?: Array<{ tag: { name: string } }>;
  };
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role?: string | null;
  };
  appointment?: {
    title: string;
    startAt: Date;
    endAt: Date;
    status: string;
    notes: string | null;
    calendar?: { name: string; timezone: string | null } | null;
    service?: { name: string } | null;
    assignedTo?: {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
    locationType: string | null;
    locationValue: string | null;
  };
  lead?: {
    title: string | null;
    value: { toString(): string } | null;
    source: string | null;
    pipelineStage?: {
      name: string;
      pipeline?: { name: string } | null;
    } | null;
  };
  invoice?: {
    invoiceNumber: string;
    totalAmount: { toString(): string };
    balanceDue: { toString(): string };
    dueDate: Date | null;
    status: string;
    publicToken: string;
    stripeCheckoutUrl: string | null;
  };
  estimate?: {
    estimateNumber: string;
    totalAmount: { toString(): string };
    expiryDate: Date | null;
    status: string;
  };
  payment?: {
    amount: { toString(): string };
    paidAt: Date;
    method: string;
    reference: string | null;
  };
  task?: {
    title: string;
    dueAt: Date;
    status: string;
  };
  workItem?: {
    title: string;
    status: string;
  };
  conversation?: {
    channel: string;
    messages?: Array<{ text: string | null }>;
  };
  calendar?: {
    name: string;
    timezone: string | null;
  };
  service?: {
    name: string;
    price: { toString(): string } | null;
  };
  form?: {
    name: string;
  };
};

@Injectable()
export class CustomValueResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    input: CustomValueResolveInput,
    keys?: string[],
  ): Promise<CustomValueResolveResult> {
    const requested =
      keys ??
      CUSTOM_VALUE_REGISTRY.filter(
        (entry) => entry.implementationStatus === 'implemented',
      ).map((entry) => entry.key);

    const entities = await this.loadEntities(input);
    const result: CustomValueResolveResult = {};

    for (const key of requested) {
      const definition = CUSTOM_VALUE_REGISTRY.find((entry) => entry.key === key);
      if (!definition || definition.implementationStatus !== 'implemented') {
        continue;
      }
      const value = this.resolvePath(definition.resolver, entities, input);
      if (value !== undefined && value !== '') {
        result[key] = value;
      }
    }

    return result;
  }

  private async loadEntities(
    input: CustomValueResolveInput,
  ): Promise<LoadedEntities> {
    const loaded: LoadedEntities = {};

    loaded.business = await this.prisma.business.findFirst({
      where: { id: input.businessId, deletedAt: null },
      select: {
        name: true,
        email: true,
        phoneCountryCode: true,
        phoneNumber: true,
        timezone: true,
        address: true,
        settings: true,
      },
    }).then((row) =>
      row
        ? {
            name: row.name,
            email: row.email,
            phone: [row.phoneCountryCode, row.phoneNumber]
              .filter(Boolean)
              .join(' ')
              .trim() || null,
            timezone: row.timezone,
            currency:
              typeof row.settings === 'object' &&
              row.settings !== null &&
              'financial' in row.settings &&
              typeof (row.settings as { financial?: { taxesAndCurrency?: { currencyCode?: string } } }).financial?.taxesAndCurrency?.currencyCode === 'string'
                ? (row.settings as { financial: { taxesAndCurrency: { currencyCode: string } } }).financial.taxesAndCurrency.currencyCode
                : 'USD',
            address: row.address,
          }
        : undefined,
    );

    if (input.contactId) {
      loaded.contact = await this.prisma.contact.findFirst({
        where: {
          id: input.contactId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          displayName: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          phoneCountryCode: true,
          phoneNumber: true,
          source: true,
          tags: { select: { tag: { select: { name: true } } } },
        },
      }) ?? undefined;
    }

    if (input.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: input.userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          businessMemberships: {
            where: { businessId: input.businessId, deletedAt: null },
            select: { role: true },
            take: 1,
          },
        },
      });
      if (user) {
        loaded.user = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.businessMemberships[0]?.role ?? null,
        };
      }
    }

    if (input.appointmentId) {
      loaded.appointment = await this.prisma.appointment.findFirst({
        where: {
          id: input.appointmentId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          title: true,
          startAt: true,
          endAt: true,
          status: true,
          notes: true,
          locationType: true,
          locationValue: true,
          calendar: { select: { name: true, timezone: true } },
          service: { select: { name: true } },
          assignedTo: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }) ?? undefined;
    }

    if (input.leadId) {
      loaded.lead = await this.prisma.lead.findFirst({
        where: {
          id: input.leadId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          title: true,
          value: true,
          source: true,
          pipelineStage: {
            select: {
              name: true,
              pipeline: { select: { name: true } },
            },
          },
        },
      }) ?? undefined;
    }

    if (input.invoiceId) {
      loaded.invoice = await this.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          invoiceNumber: true,
          totalAmount: true,
          balanceDue: true,
          dueDate: true,
          status: true,
          publicToken: true,
          stripeCheckoutUrl: true,
        },
      }) ?? undefined;
    }

    if (input.estimateId) {
      loaded.estimate = await this.prisma.estimate.findFirst({
        where: {
          id: input.estimateId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          estimateNumber: true,
          totalAmount: true,
          expiryDate: true,
          status: true,
        },
      }) ?? undefined;
    }

    if (input.paymentId) {
      loaded.payment = await this.prisma.payment.findFirst({
        where: {
          id: input.paymentId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          amount: true,
          paidAt: true,
          method: true,
          reference: true,
        },
      }) ?? undefined;
    }

    if (input.taskId) {
      loaded.task = await this.prisma.task.findFirst({
        where: {
          id: input.taskId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          title: true,
          dueAt: true,
          status: true,
        },
      }) ?? undefined;
    }

    if (input.workItemId) {
      loaded.workItem = await this.prisma.workItem.findFirst({
        where: {
          id: input.workItemId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          title: true,
          status: true,
        },
      }) ?? undefined;
    }

    if (input.conversationId) {
      loaded.conversation = await this.prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          channel: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { text: true },
          },
        },
      }) ?? undefined;
    }

    if (input.calendarId) {
      loaded.calendar = await this.prisma.calendar.findFirst({
        where: {
          id: input.calendarId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          name: true,
          timezone: true,
        },
      }) ?? undefined;
    }

    if (input.serviceId) {
      loaded.service = await this.prisma.service.findFirst({
        where: {
          id: input.serviceId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: {
          name: true,
          price: true,
        },
      }) ?? undefined;
    }

    if (input.formId) {
      loaded.form = await this.prisma.form.findFirst({
        where: {
          id: input.formId,
          businessId: input.businessId,
          deletedAt: null,
        },
        select: { name: true },
      }) ?? undefined;
    }

    return loaded;
  }

  private resolvePath(
    path: string,
    entities: LoadedEntities,
    input: CustomValueResolveInput,
  ): string | undefined {
    const currency = entities.business?.currency ?? 'USD';
    const timezone =
      entities.business?.timezone ??
      entities.appointment?.calendar?.timezone ??
      'UTC';

    switch (path) {
      case 'contact.firstName':
        return entities.contact?.firstName?.trim() || undefined;
      case 'contact.lastName':
        return entities.contact?.lastName?.trim() || undefined;
      case 'contact.fullName':
        return entities.contact
          ? resolveContactLabel(entities.contact)
          : undefined;
      case 'contact.email':
        return entities.contact?.email?.trim() || undefined;
      case 'contact.phone': {
        if (!entities.contact) return undefined;
        const parts = [
          entities.contact.phoneCountryCode,
          entities.contact.phoneNumber,
        ]
          .filter(Boolean)
          .join(' ')
          .trim();
        return parts || undefined;
      }
      case 'contact.companyName':
        return entities.contact?.companyName?.trim() || undefined;
      case 'contact.source':
        return entities.contact?.source?.trim() || undefined;
      case 'business.name':
        return entities.business?.name;
      case 'business.email':
        return entities.business?.email ?? undefined;
      case 'business.phone':
        return entities.business?.phone ?? undefined;
      case 'business.address':
        return entities.business?.address ?? undefined;
      case 'business.timezone':
        return entities.business?.timezone ?? undefined;
      case 'business.currency':
        return entities.business?.currency ?? undefined;
      case 'user.name':
        return entities.user ? formatUserName(entities.user) : undefined;
      case 'user.email':
        return entities.user?.email ?? undefined;
      case 'user.role':
        return entities.user?.role ?? undefined;
      case 'appointment.title':
        return entities.appointment?.title;
      case 'appointment.startAt':
        return entities.appointment
          ? formatAppointmentDateTime(entities.appointment.startAt, timezone)
          : undefined;
      case 'appointment.endAt':
        return entities.appointment
          ? formatAppointmentDateTime(entities.appointment.endAt, timezone)
          : undefined;
      case 'appointment.status':
        return entities.appointment?.status;
      case 'appointment.calendarName':
        return entities.appointment?.calendar?.name;
      case 'appointment.serviceName':
        return entities.appointment?.service?.name;
      case 'appointment.durationMinutes':
        return entities.appointment
          ? String(
              Math.max(
                0,
                Math.round(
                  (entities.appointment.endAt.getTime() -
                    entities.appointment.startAt.getTime()) /
                    60_000,
                ),
              ),
            )
          : undefined;
      case 'appointment.notes':
        return entities.appointment?.notes ?? undefined;
      case 'appointment.location':
        return (
          entities.appointment?.locationValue ??
          entities.appointment?.locationType ??
          undefined
        );
      case 'calendar.name':
        return entities.calendar?.name ?? entities.appointment?.calendar?.name;
      case 'calendar.timezone':
        return (
          entities.calendar?.timezone ??
          entities.appointment?.calendar?.timezone ??
          undefined
        );
      case 'lead.title':
        return entities.lead?.title ?? undefined;
      case 'lead.value':
        return entities.lead?.value
          ? formatMoney(entities.lead.value, currency)
          : undefined;
      case 'lead.stageName':
        return entities.lead?.pipelineStage?.name;
      case 'lead.pipelineName':
        return entities.lead?.pipelineStage?.pipeline?.name ?? undefined;
      case 'lead.source':
        return entities.lead?.source ?? undefined;
      case 'form.name':
        return entities.form?.name;
      case 'form.submissionId':
        return input.submissionId;
      case 'form.submittedAt':
        return input.submissionId ? new Date().toISOString() : undefined;
      case 'estimate.number':
        return entities.estimate?.estimateNumber;
      case 'estimate.total':
        return entities.estimate
          ? formatMoney(entities.estimate.totalAmount, currency)
          : undefined;
      case 'estimate.status':
        return entities.estimate?.status;
      case 'estimate.dueDate':
        return entities.estimate?.expiryDate?.toISOString();
      case 'invoice.number':
        return entities.invoice?.invoiceNumber;
      case 'invoice.total':
        return entities.invoice
          ? formatMoney(entities.invoice.totalAmount, currency)
          : undefined;
      case 'invoice.balanceDue':
        return entities.invoice
          ? formatMoney(entities.invoice.balanceDue, currency)
          : undefined;
      case 'invoice.dueDate':
        return entities.invoice?.dueDate?.toISOString();
      case 'invoice.status':
        return entities.invoice?.status;
      case 'invoice.paymentLink':
        return entities.invoice?.stripeCheckoutUrl ?? undefined;
      case 'payment.amount':
        return entities.payment
          ? formatMoney(entities.payment.amount, currency)
          : undefined;
      case 'payment.date':
        return entities.payment?.paidAt.toISOString();
      case 'payment.method':
        return entities.payment?.method;
      case 'payment.reference':
        return entities.payment?.reference ?? undefined;
      case 'conversation.channel':
        return entities.conversation?.channel;
      case 'conversation.lastMessagePreview':
        return entities.conversation?.messages?.[0]?.text ?? undefined;
      case 'service.name':
        return entities.service?.name;
      case 'service.price':
        return entities.service?.price
          ? formatMoney(entities.service.price, currency)
          : undefined;
      case 'service.duration':
        return entities.appointment
          ? String(
              Math.max(
                0,
                Math.round(
                  (entities.appointment.endAt.getTime() -
                    entities.appointment.startAt.getTime()) /
                    60_000,
                ),
              ),
            )
          : undefined;
      case 'task.title':
        return entities.task?.title;
      case 'task.dueDate':
        return entities.task?.dueAt.toISOString();
      case 'task.status':
        return entities.task?.status;
      case 'workItem.title':
        return entities.workItem?.title;
      case 'workItem.status':
        return entities.workItem?.status;
      default:
        return undefined;
    }
  }
}
