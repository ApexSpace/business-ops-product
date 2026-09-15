import { Injectable } from '@nestjs/common';
import { InvoiceLineType, MembershipStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  ReportColumn,
  ReportDocument,
  ReportFilters,
  ReportRow,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import {
  asStringArray,
  moneyNumber,
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';
import {
  loadClosedInvoicesWithItems,
  staffDisplayName,
} from '../utils/closed-invoices.util';

const DESCRIPTION =
  'Provides insights into sales metrics, such as average retail product total per sale by each staff member.';

const COLUMNS: ReportColumn[] = [
  { key: 'staff', label: 'Staff', format: 'text', align: 'left' },
  { key: 'salesCount', label: '# Sales', format: 'int' },
  {
    key: 'avgProductTotal',
    label: 'Avg Product Total Per Sale',
    format: 'money',
  },
  {
    key: 'avgServiceTotal',
    label: 'Avg Service Total Per Sale',
    format: 'money',
  },
  {
    key: 'avgProductQty',
    label: 'Avg # of Products Per Sale',
    format: 'text',
    align: 'right',
  },
];

type StaffAgg = {
  name: string;
  /** Distinct closed invoices where this staff had at least one line. */
  saleIds: Set<string>;
  productTotal: number;
  serviceTotal: number;
  productQty: number;
};

function emptyAgg(name: string): StaffAgg {
  return {
    name,
    saleIds: new Set(),
    productTotal: 0,
    serviceTotal: 0,
    productQty: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatAvgQty(n: number): string {
  if (Math.abs(n) < 0.00005) return '0';
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function cellsFromAgg(agg: StaffAgg): Record<string, string | number | null> {
  const salesCount = agg.saleIds.size;
  return {
    staff: agg.name,
    salesCount,
    avgProductTotal: salesCount ? round2(agg.productTotal / salesCount) : 0,
    avgServiceTotal: salesCount ? round2(agg.serviceTotal / salesCount) : 0,
    avgProductQty: salesCount
      ? formatAvgQty(agg.productQty / salesCount)
      : '0',
  };
}

function mergeAgg(target: StaffAgg, source: StaffAgg): void {
  for (const saleId of source.saleIds) target.saleIds.add(saleId);
  target.productTotal += source.productTotal;
  target.serviceTotal += source.serviceTotal;
  target.productQty += source.productQty;
}

@Injectable()
export class BiSalesProvider implements ReportDataProvider {
  readonly key = 'bi_sales';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const staffFilter = asStringArray(filters.staffIds);

    const [invoices, memberships] = await Promise.all([
      loadClosedInvoicesWithItems(
        this.prisma,
        businessId,
        range.start,
        range.end,
      ),
      this.prisma.businessMembership.findMany({
        where: {
          businessId,
          deletedAt: null,
          status: MembershipStatus.ACTIVE,
        },
        select: {
          userId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const byStaff = new Map<string, StaffAgg>();

    for (const member of memberships) {
      byStaff.set(member.userId, emptyAgg(staffDisplayName(member.user)));
    }

    for (const inv of invoices) {
      /** Per-invoice buckets so each sale counts once per staff. */
      const perSale = new Map<
        string,
        {
          productTotal: number;
          serviceTotal: number;
          productQty: number;
          name: string;
        }
      >();

      for (const item of inv.items) {
        if (
          item.lineType !== InvoiceLineType.SERVICE &&
          item.lineType !== InvoiceLineType.PRODUCT
        ) {
          continue;
        }
        const staffId = item.staffUserId;
        if (!staffId) continue;

        let bucket = perSale.get(staffId);
        if (!bucket) {
          bucket = {
            productTotal: 0,
            serviceTotal: 0,
            productQty: 0,
            name: staffDisplayName(item.staffUser),
          };
          perSale.set(staffId, bucket);
        }

        const amount = moneyNumber(item.totalPrice);
        const qty = moneyNumber(item.quantity);
        if (item.lineType === InvoiceLineType.PRODUCT) {
          bucket.productTotal += amount;
          bucket.productQty += qty;
        } else {
          bucket.serviceTotal += amount;
        }
      }

      for (const [staffId, bucket] of perSale) {
        const agg = byStaff.get(staffId) ?? emptyAgg(bucket.name);
        if (!byStaff.has(staffId)) {
          agg.name = bucket.name;
        }
        agg.saleIds.add(inv.id);
        agg.productTotal += bucket.productTotal;
        agg.serviceTotal += bucket.serviceTotal;
        agg.productQty += bucket.productQty;
        byStaff.set(staffId, agg);
      }
    }

    const displayIds =
      staffFilter.length > 0
        ? staffFilter
        : [...byStaff.keys()].sort((a, b) =>
            (byStaff.get(a)?.name ?? '').localeCompare(
              byStaff.get(b)?.name ?? '',
            ),
          );

    // Resolve names for selected staff not yet in the map.
    const missingIds = displayIds.filter((id) => !byStaff.has(id));
    if (missingIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      for (const user of users) {
        byStaff.set(user.id, emptyAgg(staffDisplayName(user)));
      }
      for (const id of missingIds) {
        if (!byStaff.has(id)) {
          byStaff.set(id, emptyAgg('Staff'));
        }
      }
    }

    const staffRows = displayIds
      .map((id) => {
        const agg = byStaff.get(id) ?? emptyAgg('Staff');
        return { id, agg };
      })
      .sort((a, b) => a.agg.name.localeCompare(b.agg.name));

    const rows: ReportRow[] = staffRows.map(({ id, agg }) =>
      row(id, cellsFromAgg(agg)),
    );

    const selectedTotal = emptyAgg('Selected Staff Total');
    for (const { agg } of staffRows) {
      mergeAgg(selectedTotal, agg);
    }
    rows.push(
      row('selected-staff-total', cellsFromAgg(selectedTotal), {
        isTotal: true,
      }),
    );

    const allTotal = emptyAgg('All Staff Total');
    for (const agg of byStaff.values()) {
      mergeAgg(allTotal, agg);
    }
    rows.push(
      row('all-staff-total', cellsFromAgg(allTotal), { isTotal: true }),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Business Intelligence: Sales',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
      }),
      [section('bi-sales', COLUMNS, rows)],
    );
  }
}
