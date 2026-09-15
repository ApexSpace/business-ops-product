import { Injectable } from '@nestjs/common';
import { AutomationWorkflowRunStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class AutomationRunsProvider implements ReportDataProvider {
  readonly key = 'automation_runs';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const runs = await this.prisma.automationWorkflowRun.findMany({
      where: {
        businessId,
        startedAt: { gte: range.start, lte: range.end },
      },
      include: { workflow: { select: { name: true } } },
    });

    const byWorkflow = new Map<
      string,
      { name: string; completed: number; failed: number; running: number; total: number }
    >();
    for (const run of runs) {
      const agg = byWorkflow.get(run.workflowId) ?? {
        name: run.workflow.name,
        completed: 0,
        failed: 0,
        running: 0,
        total: 0,
      };
      agg.total += 1;
      if (run.status === AutomationWorkflowRunStatus.COMPLETED) agg.completed += 1;
      else if (run.status === AutomationWorkflowRunStatus.FAILED) agg.failed += 1;
      else if (
        run.status === AutomationWorkflowRunStatus.RUNNING ||
        run.status === AutomationWorkflowRunStatus.WAITING
      ) {
        agg.running += 1;
      }
      byWorkflow.set(run.workflowId, agg);
    }

    let totalRuns = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    const rows = [...byWorkflow.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([id, agg]) => {
        totalRuns += agg.total;
        totalCompleted += agg.completed;
        totalFailed += agg.failed;
        return row(id, {
          workflow: agg.name,
          total: agg.total,
          completed: agg.completed,
          failed: agg.failed,
          running: agg.running,
          successPct: agg.total ? Math.round((agg.completed / agg.total) * 1000) / 10 : 0,
        });
      });
    rows.push(
      row(
        'total',
        {
          workflow: 'Total',
          total: totalRuns,
          completed: totalCompleted,
          failed: totalFailed,
          running: runs.filter(
            (r) =>
              r.status === AutomationWorkflowRunStatus.RUNNING ||
              r.status === AutomationWorkflowRunStatus.WAITING,
          ).length,
          successPct: totalRuns ? Math.round((totalCompleted / totalRuns) * 1000) / 10 : 0,
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Automation Runs',
        description: 'Automation run success and failure counts by workflow.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'runs',
          [
            { key: 'workflow', label: 'Workflow', format: 'text', align: 'left' },
            { key: 'total', label: 'Total Runs', format: 'int' },
            { key: 'completed', label: 'Completed', format: 'int' },
            { key: 'failed', label: 'Failed', format: 'int' },
            { key: 'running', label: 'Running', format: 'int' },
            { key: 'successPct', label: 'Success %', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
