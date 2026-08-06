import { Injectable } from '@nestjs/common';
import {
  AppointmentSource,
  AppointmentStatus,
} from '@prisma/client';
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
  asString,
  moneyNumber,
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
  'Shows client and appointment details for canceled appointments.';

const FOOTNOTE =
  'To see additional client and appointment information please download the Excel report.';

/** Default late-cancellation window when policy metadata is absent (hours). */
export const DEFAULT_LATE_CANCEL_HOURS = 24;

export type CancellationTypeFilter =
  | 'all'
  | 'normal'
  | 'late'
  | 'no_show'
  | 'deleted'
  | 'expired_express';

export type CancellationTypeKey = Exclude<CancellationTypeFilter, 'all'>;

const TYPE_LABELS: Record<CancellationTypeKey, string> = {
  normal: 'Normal Cancellation',
  late: 'Late Cancellation',
  no_show: 'No Show',
  deleted: 'Deleted',
  expired_express: 'Expired Express Booking',
};

const COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'phone', label: 'Phone', format: 'text', align: 'left' },
  {
    key: 'staff',
    label: 'Staff Member(s)',
    format: 'text',
    align: 'left',
  },
  { key: 'type', label: 'Type', format: 'text', align: 'left' },
  { key: 'canceledOn', label: 'Canceled On', format: 'text', align: 'left' },
  {
    key: 'nextAppointment',
    label: 'Next Appointment',
    format: 'text',
    align: 'left',
  },
  {
    key: 'clientEmail',
    label: 'Client Email',
    format: 'text',
    align: 'left',
    excelOnly: true,
  },
  {
    key: 'service',
    label: 'Service',
    format: 'text',
    align: 'left',
    excelOnly: true,
  },
  {
    key: 'servicePrice',
    label: 'Service Price',
    format: 'money',
    align: 'right',
    excelOnly: true,
  },
  {
    key: 'notes',
    label: 'Appointment Notes',
    format: 'text',
    align: 'left',
    excelOnly: true,
  },
  {
    key: 'canceledBy',
    label: 'Canceled By',
    format: 'text',
    align: 'left',
    excelOnly: true,
  },
];

type ApptRow = {
  id: string;
  contactId: string | null;
  assignedToId: string | null;
  startAt: Date;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes: string | null;
  metadata: unknown;
  updatedAt: Date;
  deletedAt: Date | null;
  expressBookingCompletedAt: Date | null;
  guestFirstName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  guestPhoneCountryCode: string | null;
  contact: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    phoneCountryCode: string | null;
  } | null;
  assignedTo: { firstName: string | null; lastName: string | null } | null;
  service: { name: string; price: unknown } | null;
  serviceLines: Array<{
    price: unknown;
    assignedToId: string | null;
    assignedTo: { firstName: string | null; lastName: string | null } | null;
    service: { name: string; price: unknown } | null;
  }>;
};

function parseMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function formatReportDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('MMMM d, yyyy');
}

function clientLabel(appt: ApptRow): string {
  if (appt.contact) {
    return (
      appt.contact.displayName?.trim() ||
      [appt.contact.firstName, appt.contact.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      '—'
    );
  }
  return appt.guestFirstName?.trim() || 'Guest';
}

function phoneLabel(appt: ApptRow): string {
  const number =
    appt.contact?.phoneNumber?.trim() || appt.guestPhone?.trim() || '';
  if (!number) return '—';
  const code =
    appt.contact?.phoneCountryCode?.trim() ||
    appt.guestPhoneCountryCode?.trim() ||
    '';
  return code ? `${code} ${number}` : number;
}

function staffLabel(appt: ApptRow): string {
  const names = new Map<string, string>();
  if (appt.assignedToId) {
    names.set(appt.assignedToId, staffDisplayName(appt.assignedTo));
  }
  for (const line of appt.serviceLines) {
    if (!line.assignedToId) continue;
    names.set(line.assignedToId, staffDisplayName(line.assignedTo));
  }
  if (names.size === 0) return '—';
  return [...names.values()].join(', ');
}

function serviceLabel(appt: ApptRow): string {
  if (appt.serviceLines.length > 0) {
    const names = appt.serviceLines
      .map((line) => line.service?.name)
      .filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  return appt.service?.name || '—';
}

function servicePriceTotal(appt: ApptRow): number {
  if (appt.serviceLines.length > 0) {
    return Math.round(
      appt.serviceLines.reduce((sum, line) => {
        if (line.price != null) return sum + moneyNumber(line.price);
        return sum + moneyNumber(line.service?.price);
      }, 0) * 100,
    ) / 100;
  }
  return Math.round(moneyNumber(appt.service?.price) * 100) / 100;
}

/**
 * Classify cancellation type for Mangomint-parity filters.
 * Precedence: expired express → deleted → no-show → late → normal.
 */
export function classifyCancellationType(
  appt: {
    status: AppointmentStatus;
    source: AppointmentSource;
    startAt: Date;
    deletedAt: Date | null;
    expressBookingCompletedAt: Date | null;
    metadata: unknown;
  },
  canceledAt: Date,
  lateWindowHours = DEFAULT_LATE_CANCEL_HOURS,
): CancellationTypeKey {
  const meta = parseMeta(appt.metadata);

  if (
    meta.expressExpired === true ||
    meta.cancellationType === 'expired_express'
  ) {
    return 'expired_express';
  }

  // Soft-deleted expired express (cleanup after system cancel).
  if (
    appt.source === AppointmentSource.EXPRESS &&
    appt.status === AppointmentStatus.CANCELLED &&
    appt.deletedAt != null &&
    !appt.expressBookingCompletedAt
  ) {
    return 'expired_express';
  }

  if (appt.deletedAt) {
    return 'deleted';
  }

  if (appt.status === AppointmentStatus.NO_SHOW) {
    return 'no_show';
  }

  if (meta.cancellationType === 'late' || meta.lateCancellation === true) {
    return 'late';
  }
  if (meta.cancellationType === 'normal') {
    return 'normal';
  }

  const hoursBeforeStart =
    (appt.startAt.getTime() - canceledAt.getTime()) / 3_600_000;
  if (hoursBeforeStart >= 0 && hoursBeforeStart <= lateWindowHours) {
    return 'late';
  }

  return 'normal';
}

function eventAt(appt: ApptRow): Date {
  return appt.deletedAt ?? appt.updatedAt;
}

@Injectable()
export class AppointmentCancellationsProvider implements ReportDataProvider {
  readonly key = 'appointment_cancellations';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const typeFilter = asString(filters.cancellationType, 'all');

    const appointments = (await this.prisma.appointment.findMany({
      where: {
        businessId,
        OR: [
          {
            status: {
              in: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
            },
            updatedAt: { gte: range.start, lte: range.end },
          },
          {
            deletedAt: { gte: range.start, lte: range.end },
          },
        ],
      },
      select: {
        id: true,
        contactId: true,
        assignedToId: true,
        startAt: true,
        status: true,
        source: true,
        notes: true,
        metadata: true,
        updatedAt: true,
        deletedAt: true,
        expressBookingCompletedAt: true,
        guestFirstName: true,
        guestEmail: true,
        guestPhone: true,
        guestPhoneCountryCode: true,
        contact: {
          select: {
            displayName: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            phoneCountryCode: true,
          },
        },
        assignedTo: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, price: true } },
        serviceLines: {
          select: {
            price: true,
            assignedToId: true,
            assignedTo: { select: { firstName: true, lastName: true } },
            service: { select: { name: true, price: true } },
          },
        },
      },
      orderBy: { startAt: 'asc' },
      take: 10000,
    })) as ApptRow[];

    const candidates = appointments.filter(
      (appt) => !isTimeBlockMetadata(appt.metadata),
    );

    const ids = candidates.map((a) => a.id);
    const contactIds = [
      ...new Set(
        candidates
          .map((a) => a.contactId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const earliestStart =
      candidates.length > 0
        ? candidates.reduce(
            (min, a) => (a.startAt < min ? a.startAt : min),
            candidates[0]!.startAt,
          )
        : range.start;

    const [audits, futureAppointments] = await Promise.all([
      ids.length > 0
        ? this.prisma.auditLog.findMany({
            where: {
              businessId,
              entityType: 'Appointment',
              entityId: { in: ids },
              action: {
                in: ['appointment.status_changed', 'appointment.deleted'],
              },
            },
            select: {
              entityId: true,
              action: true,
              metadata: true,
              createdAt: true,
              actor: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50000,
          })
        : Promise.resolve([]),
      contactIds.length > 0
        ? this.prisma.appointment.findMany({
            where: {
              businessId,
              deletedAt: null,
              contactId: { in: contactIds },
              startAt: { gt: earliestStart },
              status: {
                notIn: [
                  AppointmentStatus.CANCELLED,
                  AppointmentStatus.NO_SHOW,
                  AppointmentStatus.PENDING_COMPLETION,
                ],
              },
            },
            select: { contactId: true, startAt: true },
            orderBy: { startAt: 'asc' },
            take: 50000,
          })
        : Promise.resolve([]),
    ]);

    const cancelAuditById = new Map<string, { at: Date; by: string }>();
    for (const audit of audits) {
      if (cancelAuditById.has(audit.entityId)) continue;
      const meta = parseMeta(audit.metadata);
      const toStatus = meta.to;
      if (
        audit.action === 'appointment.deleted' ||
        toStatus === AppointmentStatus.CANCELLED ||
        toStatus === AppointmentStatus.NO_SHOW
      ) {
        cancelAuditById.set(audit.entityId, {
          at: audit.createdAt,
          by: staffDisplayName(audit.actor),
        });
      }
    }

    const futuresByContact = new Map<string, Date[]>();
    for (const future of futureAppointments) {
      if (!future.contactId) continue;
      const list = futuresByContact.get(future.contactId) ?? [];
      list.push(future.startAt);
      futuresByContact.set(future.contactId, list);
    }

    const rows: ReportRow[] = [];

    for (const appt of candidates) {
      const audit = cancelAuditById.get(appt.id);
      const canceledAt = audit?.at ?? eventAt(appt);
      const typeKey = classifyCancellationType(appt, canceledAt);

      if (typeFilter !== 'all' && typeFilter !== typeKey) {
        continue;
      }

      let nextLabel = '—';
      if (appt.contactId) {
        const futures = futuresByContact.get(appt.contactId) ?? [];
        const next = futures.find(
          (start) => start.getTime() > appt.startAt.getTime(),
        );
        if (next) {
          nextLabel = formatReportDate(next, timezone);
        }
      }

      const canceledBy =
        typeKey === 'expired_express'
          ? 'System (Express Booking expired)'
          : audit?.by || '—';

      rows.push(
        row(appt.id, {
          date: formatReportDate(appt.startAt, timezone),
          client: clientLabel(appt),
          phone: phoneLabel(appt),
          staff: staffLabel(appt),
          type: TYPE_LABELS[typeKey],
          canceledOn: formatReportDate(canceledAt, timezone),
          nextAppointment: nextLabel,
          clientEmail:
            appt.contact?.email?.trim() || appt.guestEmail?.trim() || '—',
          service: serviceLabel(appt),
          servicePrice: servicePriceTotal(appt),
          notes: appt.notes?.trim() || '—',
          canceledBy,
        }),
      );
    }

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Appointment Cancellations',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
        footnotes: [FOOTNOTE],
      }),
      [section('cancellations', COLUMNS, rows)],
    );
  }
}
