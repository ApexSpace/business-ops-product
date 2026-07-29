import { Injectable } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class LeadPipelineFunnelProvider implements ReportDataProvider {
  readonly key = 'lead_pipeline_funnel';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const leads = await this.prisma.lead.findMany({
      where: {
        businessId,
        deletedAt: null,
        createdAt: { gte: range.start, lte: range.end },
      },
      include: {
        pipelineStage: { select: { name: true, position: true } },
        pipeline: { select: { name: true } },
      },
    });

    const byStage = new Map<string, { label: string; count: number; value: number; position: number }>();
    let won = 0;
    let lost = 0;
    for (const lead of leads) {
      const key = lead.pipelineStageId;
      const agg = byStage.get(key) ?? {
        label: lead.pipelineStage.name,
        count: 0,
        value: 0,
        position: lead.pipelineStage.position,
      };
      agg.count += 1;
      agg.value += moneyNumber(lead.value);
      byStage.set(key, agg);
      if (lead.status === LeadStatus.WON) won += 1;
      if (lead.status === LeadStatus.LOST) lost += 1;
    }

    const stageRows = [...byStage.entries()]
      .sort((a, b) => a[1].position - b[1].position)
      .map(([id, agg]) =>
        row(id, {
          stage: agg.label,
          count: agg.count,
          value: Math.round(agg.value * 100) / 100,
        }),
      );

    const pipelineName = leads[0]?.pipeline.name ?? 'Pipeline';
    const summaryRows = [
      row('created', { metric: 'Leads created', value: leads.length }),
      row('won', { metric: 'Won', value: won }),
      row('lost', { metric: 'Lost', value: lost }),
      row(
        'winRate',
        {
          metric: 'Win rate %',
          value: leads.length ? Math.round((won / leads.length) * 1000) / 10 : 0,
        },
      ),
    ];

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Lead Pipeline Funnel',
        description: 'Lead stage conversion and counts for the selected period.',
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
          'stages',
          [
            { key: 'stage', label: 'Stage', format: 'text', align: 'left' },
            { key: 'count', label: '# Leads', format: 'int' },
            { key: 'value', label: 'Pipeline Value', format: 'money' },
          ],
          stageRows,
          pipelineName,
        ),
      ],
    );
  }
}
