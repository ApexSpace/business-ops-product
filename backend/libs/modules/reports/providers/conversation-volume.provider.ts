import { Injectable } from '@nestjs/common';
import { ConversationDirection } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class ConversationVolumeProvider implements ReportDataProvider {
  readonly key = 'conversation_volume';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const messages = await this.prisma.conversationMessage.findMany({
      where: {
        businessId,
        deletedAt: null,
        createdAt: { gte: range.start, lte: range.end },
      },
      select: { channel: true, direction: true },
    });

    const byChannel = new Map<string, { inbound: number; outbound: number; total: number }>();
    for (const msg of messages) {
      const agg = byChannel.get(msg.channel) ?? { inbound: 0, outbound: 0, total: 0 };
      agg.total += 1;
      if (msg.direction === ConversationDirection.INBOUND) agg.inbound += 1;
      else agg.outbound += 1;
      byChannel.set(msg.channel, agg);
    }

    let totalInbound = 0;
    let totalOutbound = 0;
    const rows = [...byChannel.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([channel, agg]) => {
        totalInbound += agg.inbound;
        totalOutbound += agg.outbound;
        return row(channel, {
          channel,
          inbound: agg.inbound,
          outbound: agg.outbound,
          total: agg.total,
        });
      });
    rows.push(
      row(
        'total',
        {
          channel: 'Total',
          inbound: totalInbound,
          outbound: totalOutbound,
          total: totalInbound + totalOutbound,
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Conversation Volume & Response',
        description: 'Inbox message volume by channel for the selected period.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'volume',
          [
            { key: 'channel', label: 'Channel', format: 'text', align: 'left' },
            { key: 'inbound', label: 'Inbound', format: 'int' },
            { key: 'outbound', label: 'Outbound', format: 'int' },
            { key: 'total', label: 'Total', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
