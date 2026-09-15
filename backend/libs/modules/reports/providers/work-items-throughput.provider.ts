import { Injectable } from '@nestjs/common';
import { WorkItemStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class WorkItemsThroughputProvider implements ReportDataProvider {
  readonly key = 'work_items_throughput';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const created = await this.prisma.workItem.findMany({
      where: {
        businessId,
        deletedAt: null,
        createdAt: { gte: range.start, lte: range.end },
      },
      select: { status: true, assignedToId: true, assignedTo: { select: { firstName: true, lastName: true } } },
    });
    const completed = await this.prisma.workItem.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: WorkItemStatus.COMPLETED,
        completedAt: { gte: range.start, lte: range.end },
      },
      select: { assignedToId: true, assignedTo: { select: { firstName: true, lastName: true } } },
    });

    const byStatus = new Map<string, number>();
    for (const item of created) {
      byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1);
    }
    const statusRows = [...byStatus.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([status, count]) => row(status, { status, created: count }));

    const byAssignee = new Map<string, { name: string; completed: number }>();
    for (const item of completed) {
      const id = item.assignedToId ?? 'unassigned';
      const name = item.assignedTo
        ? [item.assignedTo.firstName, item.assignedTo.lastName].filter(Boolean).join(' ') || 'Staff'
        : 'Unassigned';
      const agg = byAssignee.get(id) ?? { name, completed: 0 };
      agg.completed += 1;
      byAssignee.set(id, agg);
    }
    const assigneeRows = [...byAssignee.entries()]
      .sort((a, b) => b[1].completed - a[1].completed)
      .map(([id, agg]) => row(id, { assignee: agg.name, completed: agg.completed }));

    const summaryRows = [
      row('created', { metric: 'Created in period', value: created.length }),
      row('completed', { metric: 'Completed in period', value: completed.length }),
    ];

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Work Items Throughput',
        description: 'Work items created and completed by status and assignee.',
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
          'by_status',
          [
            { key: 'status', label: 'Status', format: 'text', align: 'left' },
            { key: 'created', label: 'Created', format: 'int' },
          ],
          statusRows,
          'Created by status',
        ),
        section(
          'by_assignee',
          [
            { key: 'assignee', label: 'Assignee', format: 'text', align: 'left' },
            { key: 'completed', label: 'Completed', format: 'int' },
          ],
          assigneeRows,
          'Completed by assignee',
        ),
      ],
    );
  }
}
