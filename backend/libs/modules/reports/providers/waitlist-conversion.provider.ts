import { Injectable } from '@nestjs/common';
import { BookingWaitlistStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class WaitlistConversionProvider implements ReportDataProvider {
  readonly key = 'waitlist_conversion';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const entries = await this.prisma.bookingWaitlistEntry.findMany({
      where: {
        businessId,
        createdAt: { gte: range.start, lte: range.end },
      },
      include: {
        service: { select: { name: true } },
        contact: { select: { displayName: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const booked = entries.filter((e) => e.status === BookingWaitlistStatus.BOOKED).length;
    const matched = entries.filter((e) => e.status === BookingWaitlistStatus.MATCHED).length;
    const waiting = entries.filter((e) => e.status === BookingWaitlistStatus.WAITING).length;
    const conversionRate = entries.length
      ? Math.round((booked / entries.length) * 1000) / 10
      : 0;

    const summaryRows = [
      row('total', { metric: 'Waitlist entries', value: entries.length }),
      row('booked', { metric: 'Booked', value: booked }),
      row('matched', { metric: 'Matched', value: matched }),
      row('waiting', { metric: 'Still waiting', value: waiting }),
      row('rate', { metric: 'Conversion %', value: conversionRate }),
    ];

    const detailRows = entries.map((e) =>
      row(e.id, {
        date: e.createdAt.toISOString().slice(0, 10),
        client:
          e.contact.displayName ||
          [e.contact.firstName, e.contact.lastName].filter(Boolean).join(' ') ||
          '—',
        service: e.service.name,
        status: e.status,
        preferredDate: e.preferredDate.toISOString().slice(0, 10),
      }),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Waitlist Conversion',
        description: 'Waitlist entries converted to appointments.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'summary',
          [
            { key: 'metric', label: 'Metric', format: 'text', align: 'left' },
            { key: 'value', label: 'Value', format: 'int' },
          ],
          summaryRows,
        ),
        section(
          'entries',
          [
            { key: 'date', label: 'Created', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'service', label: 'Service', format: 'text', align: 'left' },
            { key: 'status', label: 'Status', format: 'text', align: 'left' },
            { key: 'preferredDate', label: 'Preferred Date', format: 'text', align: 'left' },
          ],
          detailRows,
          'Waitlist entries',
        ),
      ],
    );
  }
}
