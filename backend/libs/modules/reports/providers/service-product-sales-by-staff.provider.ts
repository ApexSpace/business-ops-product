import { Injectable } from '@nestjs/common';
import { InvoiceLineType } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  ReportColumn,
  ReportDocument,
  ReportFilters,
  ReportRow,
  ReportSection,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import {
  asString,
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

type LineAgg = {
  name: string;
  category: string;
  qty: number;
  adjustments: number;
  appliedPackages: number;
  sales: number;
};

type StaffAgg = {
  name: string;
  serviceQty: number;
  serviceSales: number;
  productQty: number;
  productSales: number;
  services: Map<string, LineAgg>;
  products: Map<string, LineAgg>;
};

const OVERVIEW_COLUMNS: ReportColumn[] = [
  { key: 'staff', label: 'Staff Member', format: 'text', align: 'left' },
  { key: 'serviceQty', label: '# Services', format: 'int' },
  { key: 'serviceSales', label: 'Service Sales', format: 'money' },
  { key: 'productQty', label: '# Products', format: 'int' },
  { key: 'productSales', label: 'Product Sales', format: 'money' },
  { key: 'total', label: 'Total Sales', format: 'money' },
];

const SERVICE_DETAIL_COLUMNS: ReportColumn[] = [
  {
    key: 'label',
    label: 'Service Category/Service',
    format: 'text',
    align: 'left',
  },
  { key: 'qty', label: '# Services', format: 'int' },
  { key: 'adjustments', label: 'Adjustments', format: 'money' },
  { key: 'appliedPackages', label: 'Applied Packages', format: 'money' },
  { key: 'sales', label: 'Sales', format: 'money' },
];

const PRODUCT_DETAIL_COLUMNS: ReportColumn[] = [
  {
    key: 'label',
    label: 'Product Category/Product',
    format: 'text',
    align: 'left',
  },
  { key: 'qty', label: '# Products', format: 'int' },
  { key: 'adjustments', label: 'Adjustments', format: 'money' },
  { key: 'sales', label: 'Sales', format: 'money' },
];

const FOOTNOTE =
  'The total sales amount does not account for any refunds that were issued.';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function moneyOrDash(n: number): number | null {
  return Math.abs(n) < 0.005 ? null : round2(n);
}

function parseItemMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function isPackageOrMembershipApplied(meta: Record<string, unknown>): boolean {
  return (
    meta.membershipRedemption === true ||
    typeof meta.clientPackageId === 'string' ||
    meta.packageRedemption === true
  );
}

@Injectable()
export class ServiceProductSalesByStaffProvider implements ReportDataProvider {
  readonly key = 'service_product_sales_by_staff';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const staffFilter = asStringArray(filters.staffIds);
    const groupProductsBy = asString(filters.groupProductsBy, 'category');
    const invoices = await loadClosedInvoicesWithItems(
      this.prisma,
      businessId,
      range.start,
      range.end,
    );

    const staffMap = new Map<string, StaffAgg>();

    for (const inv of invoices) {
      for (const item of inv.items) {
        if (
          item.lineType !== InvoiceLineType.SERVICE &&
          item.lineType !== InvoiceLineType.PRODUCT
        ) {
          continue;
        }

        const staffId = item.staffUserId ?? 'unassigned';
        if (staffFilter.length > 0 && !staffFilter.includes(staffId)) {
          continue;
        }

        const staff =
          staffMap.get(staffId) ??
          ({
            name: staffDisplayName(item.staffUser),
            serviceQty: 0,
            serviceSales: 0,
            productQty: 0,
            productSales: 0,
            services: new Map(),
            products: new Map(),
          } satisfies StaffAgg);

        const qty = moneyNumber(item.quantity);
        const sales = moneyNumber(item.totalPrice);
        const unitPrice = moneyNumber(item.unitPrice);
        const meta = parseItemMeta(item.metadata);
        const packageApplied = isPackageOrMembershipApplied(meta);

        if (item.lineType === InvoiceLineType.SERVICE) {
          const listUnit = moneyNumber(item.service?.price ?? item.unitPrice);
          const listTotal = listUnit * qty;
          const appliedPackages = packageApplied ? listTotal : 0;
          const adjustments = packageApplied
            ? 0
            : Math.max(0, listTotal - sales);

          staff.serviceQty += qty;
          staff.serviceSales += sales;

          const lineId = item.serviceId ?? `title:${item.title}`;
          const line =
            staff.services.get(lineId) ??
            ({
              name: item.service?.name ?? item.title,
              category: item.service?.category?.name ?? 'Uncategorized',
              qty: 0,
              adjustments: 0,
              appliedPackages: 0,
              sales: 0,
            } satisfies LineAgg);
          line.qty += qty;
          line.adjustments += adjustments;
          line.appliedPackages += appliedPackages;
          line.sales += sales;
          staff.services.set(lineId, line);
        } else {
          const listUnit = moneyNumber(
            item.product?.unitPrice ?? item.unitPrice ?? unitPrice,
          );
          const listTotal = listUnit * qty;
          const adjustments = Math.max(0, listTotal - sales);

          staff.productQty += qty;
          staff.productSales += sales;

          const lineId = item.productId ?? `title:${item.title}`;
          const line =
            staff.products.get(lineId) ??
            ({
              name: item.product?.name ?? item.title,
              category: item.product?.category?.name ?? 'Uncategorized',
              qty: 0,
              adjustments: 0,
              appliedPackages: 0,
              sales: 0,
            } satisfies LineAgg);
          line.qty += qty;
          line.adjustments += adjustments;
          line.sales += sales;
          staff.products.set(lineId, line);
        }

        staffMap.set(staffId, staff);
      }
    }

    // When staff are explicitly selected, include zero-activity members.
    if (staffFilter.length > 0) {
      const missingIds = staffFilter.filter((id) => !staffMap.has(id));
      if (missingIds.length > 0) {
        const users = await this.prisma.user.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, firstName: true, lastName: true },
        });
        for (const user of users) {
          staffMap.set(user.id, {
            name: staffDisplayName(user),
            serviceQty: 0,
            serviceSales: 0,
            productQty: 0,
            productSales: 0,
            services: new Map(),
            products: new Map(),
          });
        }
        for (const id of missingIds) {
          if (!staffMap.has(id)) {
            staffMap.set(id, {
              name: 'Staff',
              serviceQty: 0,
              serviceSales: 0,
              productQty: 0,
              productSales: 0,
              services: new Map(),
              products: new Map(),
            });
          }
        }
      }
    }

    const sortedStaff = [...staffMap.entries()].sort((a, b) =>
      a[1].name.localeCompare(b[1].name),
    );

    let totalServiceQty = 0;
    let totalServiceSales = 0;
    let totalProductQty = 0;
    let totalProductSales = 0;

    const overviewRows: ReportRow[] = sortedStaff.map(([id, agg]) => {
      totalServiceQty += agg.serviceQty;
      totalServiceSales += agg.serviceSales;
      totalProductQty += agg.productQty;
      totalProductSales += agg.productSales;
      return row(id, {
        staff: agg.name,
        serviceQty: round2(agg.serviceQty),
        serviceSales: round2(agg.serviceSales),
        productQty: round2(agg.productQty),
        productSales: round2(agg.productSales),
        total: round2(agg.serviceSales + agg.productSales),
      });
    });

    overviewRows.push(
      row(
        'total',
        {
          staff: 'Total',
          serviceQty: round2(totalServiceQty),
          serviceSales: round2(totalServiceSales),
          productQty: round2(totalProductQty),
          productSales: round2(totalProductSales),
          total: round2(totalServiceSales + totalProductSales),
        },
        { isTotal: true },
      ),
    );

    const sections: ReportSection[] = [
      section('overview', OVERVIEW_COLUMNS, overviewRows, {
        title: 'Name: Overview',
        subtitle: `Period: ${range.periodLabel}`,
      }),
    ];

    for (const [staffId, agg] of sortedStaff) {
      sections.push(
        section(
          `staff-${staffId}-services`,
          SERVICE_DETAIL_COLUMNS,
          this.buildServiceDetailRows(agg.services),
          {
            title: `Name: ${agg.name}`,
            subtitle: `Period: ${range.periodLabel}`,
            pageBreakBefore: true,
          },
        ),
      );
      sections.push(
        section(
          `staff-${staffId}-products`,
          PRODUCT_DETAIL_COLUMNS,
          this.buildProductDetailRows(agg.products, groupProductsBy),
          {
            title: undefined,
          },
        ),
      );
    }

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Service & Product Sales By Staff',
        description:
          'Shows the quantities and sales totals for services and products sold by each staff member.',
        periodLabel: range.periodLabel,
        context,
        footnotes: [FOOTNOTE],
      }),
      sections,
    );
  }

  private buildServiceDetailRows(services: Map<string, LineAgg>): ReportRow[] {
    if (services.size === 0) {
      return [
        row(
          'services-total',
          {
            label: 'Total',
            qty: 0,
            adjustments: 0,
            appliedPackages: 0,
            sales: 0,
          },
          { isTotal: true },
        ),
      ];
    }

    const byCategory = new Map<string, LineAgg[]>();
    for (const line of services.values()) {
      const list = byCategory.get(line.category) ?? [];
      list.push(line);
      byCategory.set(line.category, list);
    }

    const rows: ReportRow[] = [];
    let totalQty = 0;
    let totalAdj = 0;
    let totalPkg = 0;
    let totalSales = 0;

    const categories = [...byCategory.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    for (const [category, lines] of categories) {
      let catQty = 0;
      let catAdj = 0;
      let catPkg = 0;
      let catSales = 0;
      for (const line of lines) {
        catQty += line.qty;
        catAdj += line.adjustments;
        catPkg += line.appliedPackages;
        catSales += line.sales;
      }

      rows.push(
        row(
          `svc-cat-${category}`,
          {
            label: category,
            qty: round2(catQty),
            adjustments: moneyOrDash(catAdj),
            appliedPackages: moneyOrDash(catPkg),
            sales: round2(catSales),
          },
          { isGroup: true },
        ),
      );

      for (const line of lines.sort((a, b) => a.name.localeCompare(b.name))) {
        rows.push(
          row(
            `svc-${category}-${line.name}`,
            {
              label: line.name,
              qty: round2(line.qty),
              adjustments: moneyOrDash(line.adjustments),
              appliedPackages: moneyOrDash(line.appliedPackages),
              sales: round2(line.sales),
            },
            { depth: 1 },
          ),
        );
      }

      totalQty += catQty;
      totalAdj += catAdj;
      totalPkg += catPkg;
      totalSales += catSales;
    }

    rows.push(
      row(
        'services-total',
        {
          label: 'Total',
          qty: round2(totalQty),
          adjustments: round2(totalAdj),
          appliedPackages: round2(totalPkg),
          sales: round2(totalSales),
        },
        { isTotal: true },
      ),
    );

    return rows;
  }

  private buildProductDetailRows(
    products: Map<string, LineAgg>,
    groupProductsBy: string,
  ): ReportRow[] {
    if (products.size === 0) {
      return [
        row(
          'products-total',
          {
            label: 'Total',
            qty: 0,
            adjustments: null,
            sales: 0,
          },
          { isTotal: true },
        ),
      ];
    }

    const rows: ReportRow[] = [];
    let totalQty = 0;
    let totalAdj = 0;
    let totalSales = 0;

    if (groupProductsBy === 'product') {
      const lines = [...products.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const line of lines) {
        totalQty += line.qty;
        totalAdj += line.adjustments;
        totalSales += line.sales;
        rows.push(
          row(`prod-${line.name}`, {
            label: line.name,
            qty: round2(line.qty),
            adjustments: moneyOrDash(line.adjustments),
            sales: round2(line.sales),
          }),
        );
      }
    } else {
      const byCategory = new Map<string, LineAgg[]>();
      for (const line of products.values()) {
        const list = byCategory.get(line.category) ?? [];
        list.push(line);
        byCategory.set(line.category, list);
      }

      for (const [category, lines] of [...byCategory.entries()].sort((a, b) =>
        a[0].localeCompare(b[0]),
      )) {
        let catQty = 0;
        let catAdj = 0;
        let catSales = 0;
        for (const line of lines) {
          catQty += line.qty;
          catAdj += line.adjustments;
          catSales += line.sales;
        }

        rows.push(
          row(
            `prod-cat-${category}`,
            {
              label: category,
              qty: round2(catQty),
              adjustments: moneyOrDash(catAdj),
              sales: round2(catSales),
            },
            { isGroup: true },
          ),
        );

        for (const line of lines.sort((a, b) => a.name.localeCompare(b.name))) {
          rows.push(
            row(
              `prod-${category}-${line.name}`,
              {
                label: line.name,
                qty: round2(line.qty),
                adjustments: moneyOrDash(line.adjustments),
                sales: round2(line.sales),
              },
              { depth: 1 },
            ),
          );
        }

        totalQty += catQty;
        totalAdj += catAdj;
        totalSales += catSales;
      }
    }

    rows.push(
      row(
        'products-total',
        {
          label: 'Total',
          qty: round2(totalQty),
          adjustments: moneyOrDash(totalAdj),
          sales: round2(totalSales),
        },
        { isTotal: true },
      ),
    );

    return rows;
  }
}
