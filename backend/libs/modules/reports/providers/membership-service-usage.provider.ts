import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

@Injectable()
export class MembershipServiceUsageProvider implements ReportDataProvider {
  readonly key = 'membership_service_usage';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const usage = await this.prisma.membershipUsageRecord.findMany({
      where: {
        periodStart: { gte: range.start, lte: range.end },
        clientMembership: { businessId },
        usedSlots: { gt: 0 },
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
        serviceGroup: { select: { id: true, sortOrder: true } },
      },
      orderBy: { periodStart: 'desc' },
      take: 5000,
    });
    const rows = usage.map((u) =>
      row(u.id, {
        date: u.periodStart.toISOString().slice(0, 10),
        client:
          u.clientMembership.contact.displayName ||
          [
            u.clientMembership.contact.firstName,
            u.clientMembership.contact.lastName,
          ]
            .filter(Boolean)
            .join(' ') ||
          '—',
        plan: u.clientMembership.plan.name,
        group: `Group ${u.serviceGroup.sortOrder + 1}`,
        used: u.usedSlots,
        total: u.totalSlots,
      }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Membership Service Usage',
        description: 'Shows details for used membership services.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'usage',
          [
            { key: 'date', label: 'Period start', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'plan', label: 'Plan', format: 'text', align: 'left' },
            { key: 'group', label: 'Service group', format: 'text', align: 'left' },
            { key: 'used', label: 'Used', format: 'int' },
            { key: 'total', label: 'Slots', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
