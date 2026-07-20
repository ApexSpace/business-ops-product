import { Injectable } from '@nestjs/common';
import {
  ClientPackageStatus,
  PackageHistoryEventType,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  ReportColumn,
  ReportDocument,
  ReportFilters,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import { moneyNumber } from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

const COLUMNS: ReportColumn[] = [
  { key: 'packageName', label: 'Package', format: 'text', align: 'left' },
  {
    key: 'purchaseDate',
    label: 'Purchase Date',
    format: 'text',
    align: 'left',
  },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'email', label: 'Email', format: 'text', align: 'left' },
  { key: 'phone', label: 'Phone', format: 'text', align: 'left' },
  {
    key: 'remainingServices',
    label: 'Remaining Services',
    format: 'int',
    align: 'right',
  },
  {
    key: 'remainingProducts',
    label: 'Remaining Products',
    format: 'int',
    align: 'right',
  },
  { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
];

function resolveAsOfDate(filters: ReportFilters, timezone: string): DateTime {
  const raw = filters.asOfDate;
  if (typeof raw === 'string' && raw.length >= 10) {
    const parsed = DateTime.fromISO(raw, { zone: timezone });
    if (parsed.isValid) return parsed.endOf('day');
  }
  return DateTime.now().setZone(timezone).endOf('day');
}

function formatAsOfLabel(dt: DateTime): string {
  return dt.toFormat('MMMM d, yyyy');
}

function formatReportDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('LLL d, yyyy');
}

function contactLabel(
  contact: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  },
): string {
  return (
    contact.displayName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    ''
  );
}

function formatPhone(
  contact: {
    phoneCountryCode: string | null;
    phoneNumber: string | null;
  },
): string {
  const number = contact.phoneNumber?.trim();
  if (!number) return '';
  const code = contact.phoneCountryCode?.trim();
  return code ? `${code} ${number}` : number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class OutstandingPackagesProvider implements ReportDataProvider {
  readonly key = 'outstanding_packages';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const asOf = resolveAsOfDate(filters, context.timezone);
    const periodLabel = `Period: ${formatAsOfLabel(asOf)}`;
    const asOfCutoff = asOf.toUTC().toJSDate();
    const timezone = context.timezone || 'UTC';

    /**
     * Outstanding = packages purchased by end of selected day, with credits
     * still remaining after applying redemptions/adjustments through that day.
     */
    const packages = await this.prisma.clientPackage.findMany({
      where: {
        businessId,
        purchaseDate: { lte: asOfCutoff },
        status: { not: ClientPackageStatus.DELETED },
      },
      include: {
        contact: {
          select: {
            displayName: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneCountryCode: true,
            phoneNumber: true,
          },
        },
        packageTemplate: {
          select: { name: true, totalPrice: true },
        },
        serviceAllocations: {
          select: {
            serviceId: true,
            initialQty: true,
          },
        },
        history: {
          where: { createdAt: { lte: asOfCutoff } },
          select: {
            eventType: true,
            quantityChange: true,
            serviceId: true,
          },
        },
      },
      orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });

    let totalAmount = 0;
    const rows = [];

    for (const pkg of packages) {
      const closedByHistory = pkg.history.some(
        (event) =>
          event.eventType === PackageHistoryEventType.DELETED ||
          event.eventType === PackageHistoryEventType.TRANSFERRED_OUT,
      );
      if (closedByHistory) continue;

      // Expired by end of selected day → no longer outstanding.
      if (pkg.expirationDate && pkg.expirationDate <= asOfCutoff) {
        continue;
      }

      const remainingByService = new Map<string, number>();
      for (const allocation of pkg.serviceAllocations) {
        remainingByService.set(allocation.serviceId, allocation.initialQty);
      }

      for (const event of pkg.history) {
        if (
          event.eventType !== PackageHistoryEventType.REDEEMED &&
          event.eventType !== PackageHistoryEventType.ADJUSTED
        ) {
          continue;
        }
        if (!event.serviceId) continue;

        const current = remainingByService.get(event.serviceId);
        if (current == null) {
          // Allocation may have been created later; treat initial as 0.
          remainingByService.set(
            event.serviceId,
            event.quantityChange ?? 0,
          );
          continue;
        }
        remainingByService.set(
          event.serviceId,
          current + (event.quantityChange ?? 0),
        );
      }

      const remainingServices = [...remainingByService.values()].reduce(
        (sum, qty) => sum + Math.max(0, qty),
        0,
      );
      const remainingProducts = 0; // Packages are service-only in this system.

      if (remainingServices <= 0 && remainingProducts <= 0) {
        continue;
      }

      const totalInitialCredits = pkg.serviceAllocations.reduce(
        (sum, allocation) => sum + allocation.initialQty,
        0,
      );
      const packagePrice = moneyNumber(pkg.packageTemplate.totalPrice);
      const amount =
        totalInitialCredits > 0
          ? round2((remainingServices / totalInitialCredits) * packagePrice)
          : 0;

      totalAmount += amount;

      rows.push(
        row(pkg.id, {
          packageName: pkg.packageTemplate.name,
          purchaseDate: formatReportDate(pkg.purchaseDate, timezone),
          client: contactLabel(pkg.contact),
          email: pkg.contact.email?.trim() || '',
          phone: formatPhone(pkg.contact),
          remainingServices,
          remainingProducts,
          amount,
        }),
      );
    }

    rows.sort((a, b) => {
      const nameA = String(a.cells.packageName);
      const nameB = String(b.cells.packageName);
      const byPackage = nameA.localeCompare(nameB);
      if (byPackage !== 0) return byPackage;
      return String(a.cells.client).localeCompare(String(b.cells.client));
    });

    rows.push(
      row(
        'total',
        {
          packageName: 'Total',
          purchaseDate: '',
          client: '',
          email: '',
          phone: '',
          remainingServices: '',
          remainingProducts: '',
          amount: round2(totalAmount),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Outstanding Packages',
        description: 'Shows the list of outstanding package credits.',
        periodLabel,
        context,
      }),
      [section('outstanding', COLUMNS, rows)],
    );
  }
}
