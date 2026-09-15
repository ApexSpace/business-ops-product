import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import { CONDITION_BY_KEY } from '../registries/condition.registry';
import type { AutomationRunContext } from '../types/workflow.types';
import { compareValues } from '../utils/workflow-filter.util';

@Injectable()
export class ConditionEvaluatorService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    context: AutomationRunContext,
    conditionKey: string,
    operator: string,
    expected: unknown,
  ): Promise<boolean> {
    const definition = CONDITION_BY_KEY[conditionKey];
    if (!definition || definition.implementationStatus !== 'implemented') {
      return false;
    }

    const actual = await this.resolveActualValue(context, conditionKey);
    if (operator === 'exists') {
      return compareValues(operator, actual, expected);
    }
    return compareValues(operator, actual, expected);
  }

  private async resolveActualValue(
    context: AutomationRunContext,
    conditionKey: string,
  ): Promise<unknown> {
    switch (conditionKey) {
      case 'contact.has_email': {
        if (!context.contactId) return false;
        const contact = await this.prisma.contact.findFirst({
          where: {
            id: context.contactId,
            businessId: context.businessId,
            deletedAt: null,
          },
          select: { email: true },
        });
        return Boolean(contact?.email?.trim());
      }
      case 'contact.has_phone': {
        if (!context.contactId) return false;
        const contact = await this.prisma.contact.findFirst({
          where: {
            id: context.contactId,
            businessId: context.businessId,
            deletedAt: null,
          },
          select: { phoneNumber: true },
        });
        return Boolean(contact?.phoneNumber?.trim());
      }
      case 'appointment.calendar_is': {
        const appointmentId =
          context.appointmentId ??
          (context.subjectType === 'appointment'
            ? context.subjectId
            : undefined);
        if (!appointmentId) return null;
        const appointment = await this.prisma.appointment.findFirst({
          where: {
            id: appointmentId,
            businessId: context.businessId,
            deletedAt: null,
          },
          select: { calendarId: true },
        });
        return appointment?.calendarId ?? null;
      }
      case 'appointment.status_is': {
        const appointmentId =
          context.appointmentId ??
          (context.subjectType === 'appointment'
            ? context.subjectId
            : undefined);
        if (!appointmentId) return null;
        const appointment = await this.prisma.appointment.findFirst({
          where: {
            id: appointmentId,
            businessId: context.businessId,
            deletedAt: null,
          },
          select: { status: true },
        });
        return appointment?.status?.toLowerCase() ?? null;
      }
      case 'finance.status_is': {
        const invoiceId =
          context.invoiceId ??
          (context.subjectType === 'invoice' ? context.subjectId : undefined);
        if (invoiceId) {
          const invoice = await this.prisma.invoice.findFirst({
            where: {
              id: invoiceId,
              businessId: context.businessId,
              deletedAt: null,
            },
            select: { status: true },
          });
          return invoice?.status?.toLowerCase() ?? null;
        }
        const estimateId =
          context.subjectType === 'estimate' ? context.subjectId : undefined;
        if (!estimateId) return null;
        const estimate = await this.prisma.estimate.findFirst({
          where: {
            id: estimateId,
            businessId: context.businessId,
            deletedAt: null,
          },
          select: { status: true },
        });
        return estimate?.status?.toLowerCase() ?? null;
      }
      default:
        return null;
    }
  }
}
