import { Injectable } from '@nestjs/common';
import {
  ClientPackageSource,
  InvoiceLineType,
  InvoiceStatus,
} from '@prisma/client';
import { DateTime } from 'luxon';
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
import { staffDisplayName } from '../utils/closed-invoices.util';
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

const COLUMNS: ReportColumn[] = [
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  {
    key: 'packageName',
    label: 'Package Name',
    format: 'text',
    align: 'left',
  },
  { key: 'price', label: 'Price', format: 'money', align: 'right' },
  {
    key: 'soldByStaff',
    label: 'Sold By Staff',
    format: 'text',
    align: 'left',
  },
];

type PackageLine = {
  id: string;
  totalPrice: unknown;
  unitPrice: unknown;
  metadata: unknown;
  staffUser: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatReportDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('LLL d, yyyy');
}

function contactLabel(
  contact:
    | {
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
      }
    | null
    | undefined,
): string {
  if (!contact) return '';
  return (
    contact.displayName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    ''
  );
}

function parseItemMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function saleDateFromInvoice(invoice: {
  closedAt: Date | null;
  issueDate: Date;
}): Date {
  return invoice.closedAt ?? invoice.issueDate;
}

function resolveSaleNumber(
  invoice: { displaySequence: number | null } | null | undefined,
): string {
  return invoice?.displaySequence != null
    ? String(invoice.displaySequence)
    : '';
}

function matchPackageLine(
  pkg: {
    id: string;
    packageTemplateId: string;
    contactId: string;
  },
  lines: PackageLine[],
): PackageLine | null {
  if (lines.length === 0) return null;

  const byPackageId = lines.find((line) => {
    const meta = parseItemMeta(line.metadata);
    return meta.clientPackageId === pkg.id;
  });
  if (byPackageId) return byPackageId;

  const byTemplateAndOwner = lines.find((line) => {
    const meta = parseItemMeta(line.metadata);
    return (
      meta.packageTemplateId === pkg.packageTemplateId &&
      meta.ownerContactId === pkg.contactId
    );
  });
  if (byTemplateAndOwner) return byTemplateAndOwner;

  const byTemplate = lines.find((line) => {
    const meta = parseItemMeta(line.metadata);
    return meta.packageTemplateId === pkg.packageTemplateId;
  });
  if (byTemplate) return byTemplate;

  return lines.length === 1 ? lines[0]! : null;
}

@Injectable()
export class PackageSalesDetailsProvider implements ReportDataProvider {
  readonly key = 'package_sales_details';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';

    const packages = await this.prisma.clientPackage.findMany({
      where: {
        businessId,
        OR: [
          {
            invoice: {
              deletedAt: null,
              OR: [
                { closedAt: { gte: range.start, lte: range.end } },
                {
                  closedAt: null,
                  status: {
                    in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL],
                  },
                  issueDate: { gte: range.start, lte: range.end },
                },
              ],
            },
          },
          {
            invoiceId: null,
            source: {
              in: [ClientPackageSource.ONLINE, ClientPackageSource.STAFF],
            },
            purchaseDate: { gte: range.start, lte: range.end },
          },
        ],
      },
      include: {
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        packageTemplate: {
          select: { name: true, totalPrice: true },
        },
        invoice: {
          select: {
            displaySequence: true,
            closedAt: true,
            issueDate: true,
            contact: {
              select: { displayName: true, firstName: true, lastName: true },
            },
            closedBy: {
              select: { firstName: true, lastName: true },
            },
            createdBy: {
              select: { firstName: true, lastName: true },
            },
            items: {
              where: { lineType: InvoiceLineType.PACKAGE },
              select: {
                id: true,
                totalPrice: true,
                unitPrice: true,
                metadata: true,
                staffUser: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 5000,
    });

    const rows: ReportRow[] = packages.map((pkg) => {
      const line = pkg.invoice
        ? matchPackageLine(pkg, pkg.invoice.items)
        : null;

      const saleDate = pkg.invoice
        ? saleDateFromInvoice(pkg.invoice)
        : pkg.purchaseDate;

      const price = round2(
        moneyNumber(
          line?.totalPrice ?? pkg.packageTemplate.totalPrice,
        ),
      );

      const staffFromLine = line?.staffUser
        ? staffDisplayName(line.staffUser)
        : '';
      const staffFromCloser = pkg.invoice?.closedBy
        ? staffDisplayName(pkg.invoice.closedBy)
        : '';
      const staffFromCreator = pkg.invoice?.createdBy
        ? staffDisplayName(pkg.invoice.createdBy)
        : '';
      const soldByStaff =
        (staffFromLine && staffFromLine !== 'Unassigned'
          ? staffFromLine
          : '') ||
        (staffFromCloser && staffFromCloser !== 'Unassigned'
          ? staffFromCloser
          : '') ||
        (staffFromCreator && staffFromCreator !== 'Unassigned'
          ? staffFromCreator
          : '');

      return row(pkg.id, {
        saleNumber: resolveSaleNumber(pkg.invoice),
        saleDate: formatReportDate(saleDate, timezone),
        client:
          contactLabel(pkg.contact) ||
          contactLabel(pkg.invoice?.contact),
        packageName: pkg.packageTemplate.name,
        price,
        soldByStaff,
      });
    });

    rows.sort((a, b) =>
      String(b.cells.saleDate).localeCompare(String(a.cells.saleDate)),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Package Sales Details',
        description: 'Shows details for each sale of a package.',
        periodLabel: range.periodLabel,
        context,
      }),
      [section('details', COLUMNS, rows)],
    );
  }
}
