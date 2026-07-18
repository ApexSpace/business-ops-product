import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import {
  moneyNumber,
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

@Injectable()
export class MembershipPaymentsProvider implements ReportDataProvider {
  readonly key = 'membership_payments';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const events = await this.prisma.membershipBillingEvent.findMany({
      where: {
        occurredAt: { gte: range.start, lte: range.end },
        clientMembership: { businessId },
      },
      include: {
        clientMembership: {
          include: {
            contact: {
              select: { displayName: true, firstName: true, lastName: true },
            },
            plan: { select: { name: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 5000,
    });
    const rows = events.map((e) =>
      row(e.id, {
        date: e.occurredAt.toISOString().slice(0, 10),
        client:
          e.clientMembership.contact.displayName ||
          [
            e.clientMembership.contact.firstName,
            e.clientMembership.contact.lastName,
          ]
            .filter(Boolean)
            .join(' ') ||
          '—',
        plan: e.clientMembership.plan.name,
        type: e.eventType,
        amount: Math.round(moneyNumber(e.amount) * 100) / 100,
      }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Membership Payments',
        description:
          'Shows payments for new memberships and membership renewals.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'payments',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'plan', label: 'Plan', format: 'text', align: 'left' },
            { key: 'type', label: 'Type', format: 'text', align: 'left' },
            { key: 'amount', label: 'Amount', format: 'money' },
          ],
          rows,
        ),
      ],
    );
  }
}
