import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class FormSubmissionsProvider implements ReportDataProvider {
  readonly key = 'form_submissions';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        businessId,
        createdAt: { gte: range.start, lte: range.end },
      },
      select: { formId: true, form: { select: { name: true } } },
    });

    const byForm = new Map<string, { name: string; count: number }>();
    for (const sub of submissions) {
      const agg = byForm.get(sub.formId) ?? { name: sub.form.name, count: 0 };
      agg.count += 1;
      byForm.set(sub.formId, agg);
    }

    let total = 0;
    const rows = [...byForm.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, agg]) => {
        total += agg.count;
        return row(id, { form: agg.name, count: agg.count });
      });
    rows.push(row('total', { form: 'Total', count: total }, { isTotal: true }));

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Form Submissions',
        description: 'Form submission counts by form.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'submissions',
          [
            { key: 'form', label: 'Form', format: 'text', align: 'left' },
            { key: 'count', label: '# Submissions', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
