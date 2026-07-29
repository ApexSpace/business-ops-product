import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import { isTimeBlockMetadata } from '@app/modules/operations/online-booking-settings/utils/gap-avoidance.util';
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
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';
import { staffDisplayName } from '../utils/closed-invoices.util';

const DESCRIPTION =
  'Specifies how many clients from the selected time period visited again within 30, 60, 90, or 180 days.';

const RETENTION_WINDOWS = [30, 60, 90, 180] as const;
type RetentionDays = (typeof RETENTION_WINDOWS)[number];

const COLUMNS: ReportColumn[] = [
  { key: 'staff', label: 'Staff', format: 'text', align: 'left' },
  { key: 'total', label: 'Total', format: 'int', align: 'right' },
  {
    key: 'retained30',
    label: 'Retained within 30 days',
    format: 'int',
    align: 'right',
  },
  {
    key: 'retained30Pct',
    label: '30-day %',
    format: 'percent',
    align: 'right',
  },
  {
    key: 'retained60',
    label: 'Retained within 60 days',
    format: 'int',
    align: 'right',
  },
  {
    key: 'retained60Pct',
    label: '60-day %',
    format: 'percent',
    align: 'right',
  },
  {
    key: 'retained90',
    label: 'Retained within 90 days',
    format: 'int',
    align: 'right',
  },
  {
    key: 'retained90Pct',
    label: '90-day %',
    format: 'percent',
    align: 'right',
  },
  {
    key: 'retained180',
    label: 'Retained within 180 days',
    format: 'int',
    align: 'right',
  },
  {
    key: 'retained180Pct',
    label: '180-day %',
    format: 'percent',
    align: 'right',
  },
];

type StaffAgg = {
  name: string;
  /** contactId → retention flags for that client's initial appointment */
  clients: Map<
    string,
    {
      retained30: boolean;
      retained60: boolean;
      retained90: boolean;
      retained180: boolean;
    }
  >;
};

type PeriodAppt = {
  id: string;
  contactId: string | null;
  assignedToId: string | null;
  startAt: Date;
  metadata: unknown;
  assignedTo: { firstName: string | null; lastName: string | null } | null;
  serviceLines: Array<{
    assignedToId: string | null;
    assignedTo: { firstName: string | null; lastName: string | null } | null;
  }>;
};

function staffIdsForAppointment(appt: PeriodAppt): Array<{
  id: string;
  name: string;
}> {
  const byId = new Map<string, string>();
  if (appt.assignedToId) {
    byId.set(appt.assignedToId, staffDisplayName(appt.assignedTo));
  }
  for (const line of appt.serviceLines) {
    if (!line.assignedToId) continue;
    if (!byId.has(line.assignedToId)) {
      byId.set(line.assignedToId, staffDisplayName(line.assignedTo));
    }
  }
  if (byId.size === 0) {
    return [{ id: 'unassigned', name: 'Unassigned' }];
  }
  return [...byId.entries()].map(([id, name]) => ({ id, name }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return round2((part / whole) * 100);
}

function emptyFlags() {
  return {
    retained30: false,
    retained60: false,
    retained90: false,
    retained180: false,
  };
}

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86_400_000;
}

function markRetention(
  flags: ReturnType<typeof emptyFlags>,
  days: number,
): void {
  if (days <= 30) flags.retained30 = true;
  if (days <= 60) flags.retained60 = true;
  if (days <= 90) flags.retained90 = true;
  if (days <= 180) flags.retained180 = true;
}

function cellsFromAgg(
  name: string,
  clients: StaffAgg['clients'],
): Record<string, string | number | null> {
  const total = clients.size;
  let retained30 = 0;
  let retained60 = 0;
  let retained90 = 0;
  let retained180 = 0;
  for (const flags of clients.values()) {
    if (flags.retained30) retained30 += 1;
    if (flags.retained60) retained60 += 1;
    if (flags.retained90) retained90 += 1;
    if (flags.retained180) retained180 += 1;
  }
  return {
    staff: name,
    total,
    retained30,
    retained30Pct: pct(retained30, total),
    retained60,
    retained60Pct: pct(retained60, total),
    retained90,
    retained90Pct: pct(retained90, total),
    retained180,
    retained180Pct: pct(retained180, total),
  };
}

/** Build dynamic footnote describing the initial-appointment window. */
export function buildInitialClientFootnote(
  periodStart: Date,
  periodEnd: Date,
  timezone: string,
): string {
  const start = DateTime.fromJSDate(periodStart, { zone: 'utc' })
    .setZone(timezone)
    .toFormat('MMMM d, yyyy');
  const end = DateTime.fromJSDate(periodEnd, { zone: 'utc' })
    .setZone(timezone)
    .toFormat('MMMM d, yyyy');
  return `Initial clients are clients who had their first appointment in the selected period (${start} – ${end}).`;
}

@Injectable()
export class ClientRetentionProvider implements ReportDataProvider {
  readonly key = 'client_retention';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const staffFilter = asStringArray(filters.staffIds);

    const periodAppointments = (await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        contactId: { not: null },
        startAt: { gte: range.start, lte: range.end },
        status: {
          notIn: [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
            AppointmentStatus.PENDING_COMPLETION,
          ],
        },
      },
      select: {
        id: true,
        contactId: true,
        assignedToId: true,
        startAt: true,
        metadata: true,
        assignedTo: { select: { firstName: true, lastName: true } },
        serviceLines: {
          select: {
            assignedToId: true,
            assignedTo: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { startAt: 'asc' },
      take: 50000,
    })) as PeriodAppt[];

    /** contactId → first appointment in the selected period */
    const initialByContact = new Map<string, PeriodAppt>();
    for (const appt of periodAppointments) {
      if (!appt.contactId || isTimeBlockMetadata(appt.metadata)) continue;
      if (!initialByContact.has(appt.contactId)) {
        initialByContact.set(appt.contactId, appt);
      }
    }

    const contactIds = [...initialByContact.keys()];
    const followUpByContact = new Map<string, Date[]>();

    if (contactIds.length > 0) {
      const followUps = await this.prisma.appointment.findMany({
        where: {
          businessId,
          deletedAt: null,
          contactId: { in: contactIds },
          startAt: {
            gt: range.start,
            // Far enough to cover initial + 180 days even if initial is day 1.
            lte: DateTime.fromJSDate(range.end, { zone: 'utc' })
              .plus({ days: 180 })
              .toJSDate(),
          },
          status: {
            notIn: [
              AppointmentStatus.CANCELLED,
              AppointmentStatus.NO_SHOW,
              AppointmentStatus.PENDING_COMPLETION,
            ],
          },
        },
        select: { contactId: true, startAt: true, metadata: true },
        orderBy: { startAt: 'asc' },
        take: 100000,
      });

      for (const follow of followUps) {
        if (!follow.contactId || isTimeBlockMetadata(follow.metadata)) continue;
        const initial = initialByContact.get(follow.contactId);
        if (!initial) continue;
        if (follow.startAt.getTime() <= initial.startAt.getTime()) continue;
        const list = followUpByContact.get(follow.contactId) ?? [];
        list.push(follow.startAt);
        followUpByContact.set(follow.contactId, list);
      }
    }

    const byStaff = new Map<string, StaffAgg>();
    const allSelectedClients = new Map<
      string,
      ReturnType<typeof emptyFlags>
    >();

    for (const [contactId, initial] of initialByContact) {
      const staffList = staffIdsForAppointment(initial).filter((staff) =>
        staffFilter.length === 0 ? true : staffFilter.includes(staff.id),
      );
      if (staffList.length === 0) continue;

      const flags = emptyFlags();
      const followStarts = followUpByContact.get(contactId) ?? [];
      for (const followStart of followStarts) {
        const days = daysBetween(initial.startAt, followStart);
        if (days <= 0) continue;
        markRetention(flags, days);
        if (flags.retained180) break;
      }

      for (const staffInfo of staffList) {
        const staff =
          byStaff.get(staffInfo.id) ??
          ({
            name: staffInfo.name,
            clients: new Map(),
          } satisfies StaffAgg);
        staff.clients.set(contactId, { ...flags });
        byStaff.set(staffInfo.id, staff);
      }

      const existing = allSelectedClients.get(contactId);
      if (!existing) {
        allSelectedClients.set(contactId, { ...flags });
      } else {
        existing.retained30 = existing.retained30 || flags.retained30;
        existing.retained60 = existing.retained60 || flags.retained60;
        existing.retained90 = existing.retained90 || flags.retained90;
        existing.retained180 = existing.retained180 || flags.retained180;
      }
    }

    // Resolve names for selected staff with zero clients in period.
    if (staffFilter.length > 0) {
      const missing = staffFilter.filter((id) => !byStaff.has(id));
      if (missing.length > 0) {
        const users = await this.prisma.user.findMany({
          where: { id: { in: missing } },
          select: { id: true, firstName: true, lastName: true },
        });
        for (const user of users) {
          byStaff.set(user.id, {
            name: staffDisplayName(user),
            clients: new Map(),
          });
        }
      }
    }

    const staffRows = [...byStaff.entries()]
      .map(([id, agg]) => ({ id, agg }))
      .sort((a, b) => a.agg.name.localeCompare(b.agg.name));

    const rows: ReportRow[] = staffRows.map(({ id, agg }) =>
      row(id, cellsFromAgg(agg.name, agg.clients)),
    );

    rows.push(
      row(
        'all-selected',
        cellsFromAgg('All Selected Staff', allSelectedClients),
        { isTotal: true },
      ),
    );

    const initialNote = buildInitialClientFootnote(
      range.start,
      range.end,
      timezone,
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Client Retention',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
        footnotes: [
          initialNote,
          'Initial appointment: The client’s first appointment in the selected time period.',
          'Retained client: A client who had at least one appointment (with any staff member) within 30, 60, 90, or 180 days after their initial appointment.',
          'If a client’s initial appointment was with more than one staff member, the client is included in each staff member’s total. All Selected Staff counts each client once.',
        ],
      }),
      [section('client-retention', COLUMNS, rows)],
    );
  }
}

/** Exported for unit tests — classify retention windows from day deltas. */
export function retentionFlagsForDays(
  dayDeltas: number[],
): Record<`retained${RetentionDays}`, boolean> {
  const flags = emptyFlags();
  for (const days of dayDeltas) {
    if (days <= 0) continue;
    markRetention(flags, days);
  }
  return flags;
}
