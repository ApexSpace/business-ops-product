import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DataImportDuplicatePolicy,
  DataImportEntityType,
  LeadStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { FieldDefinition } from '../constants/data-io.constants';
import {
  registerEntityHandler,
  type EntityHandler,
  type ImportRowResult,
} from './entity-registry';

function exportOnlyHandler(
  entityType: DataImportEntityType,
  headers: string[],
  exportRows: EntityHandler['exportRows'],
): EntityHandler {
  return {
    entityType,
    fields: headers.map((h) => ({ key: h, label: h, aliases: [h] })),
    supportsImport: false,
    supportsExport: true,
    templateHeaders: headers,
    exportHeaders: headers,
    importRow: async () => ({
      status: 'failed',
      reason: 'Import is not supported for this entity in this release',
      row: {},
    }),
    exportRows,
  };
}

const LEAD_FIELDS: FieldDefinition[] = [
  { key: 'title', label: 'Title', aliases: ['title', 'name', 'deal_name'] },
  { key: 'contactEmail', label: 'Contact Email', aliases: ['contact_email', 'email'] },
  { key: 'value', label: 'Value', aliases: ['value', 'amount'] },
  { key: 'status', label: 'Status', aliases: ['status'] },
  { key: 'source', label: 'Source', aliases: ['source'] },
  { key: 'notes', label: 'Notes', aliases: ['notes'] },
];

const NOTE_FIELDS: FieldDefinition[] = [
  { key: 'title', label: 'Title', aliases: ['title', 'subject'] },
  {
    key: 'description',
    label: 'Description',
    aliases: ['description', 'body', 'note', 'content'],
  },
  {
    key: 'contactEmail',
    label: 'Contact Email',
    aliases: ['contact_email', 'email'],
  },
];

const TASK_FIELDS: FieldDefinition[] = [
  { key: 'title', label: 'Title', aliases: ['title', 'name'] },
  {
    key: 'description',
    label: 'Description',
    aliases: ['description', 'notes'],
  },
  { key: 'status', label: 'Status', aliases: ['status'] },
  { key: 'priority', label: 'Priority', aliases: ['priority'] },
  {
    key: 'contactEmail',
    label: 'Contact Email',
    aliases: ['contact_email', 'email'],
  },
  { key: 'dueAt', label: 'Due At', aliases: ['due_at', 'due_date'] },
];

@Injectable()
export class SecondaryEntityHandlersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    registerEntityHandler(this.leadHandler());
    registerEntityHandler(this.noteHandler());
    registerEntityHandler(this.taskHandler());
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.GIFT_CARD,
        ['ID', 'Number', 'Current balance', 'Status', 'Owner email'],
        async (businessId) => {
          const items = await this.prisma.giftCard.findMany({
            where: { businessId },
            include: { ownerContact: true },
            take: 100_000,
          });
          return items.map((g) => [
            g.id,
            g.number,
            g.currentBalance.toString(),
            g.status,
            g.ownerContact?.email ?? '',
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.CLIENT_MEMBERSHIP,
        ['ID', 'Client name', 'Email', 'Plan', 'Status', 'Start date'],
        async (businessId) => {
          const items = await this.prisma.clientMembership.findMany({
            where: { businessId },
            include: { contact: true, plan: true },
            take: 100_000,
          });
          return items.map((m) => [
            m.id,
            [m.contact?.firstName, m.contact?.lastName].filter(Boolean).join(' '),
            m.contact?.email ?? '',
            m.plan?.name ?? '',
            m.status,
            m.startDate.toISOString(),
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.CLIENT_PACKAGE,
        ['ID', 'Client email', 'Template', 'Status'],
        async (businessId) => {
          const items = await this.prisma.clientPackage.findMany({
            where: { businessId },
            include: { contact: true, packageTemplate: true },
            take: 100_000,
          });
          return items.map((p) => [
            p.id,
            p.contact?.email ?? '',
            p.packageTemplate?.name ?? '',
            p.status,
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.APPOINTMENT,
        ['ID', 'Contact email', 'Service name', 'Start at', 'End at', 'Status'],
        async (businessId) => {
          const items = await this.prisma.appointment.findMany({
            where: { businessId, deletedAt: null },
            include: { contact: true, service: true },
            orderBy: { startAt: 'desc' },
            take: 100_000,
          });
          return items.map((a) => [
            a.id,
            a.contact?.email ?? '',
            a.service?.name ?? '',
            a.startAt.toISOString(),
            a.endAt.toISOString(),
            a.status,
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.INVOICE,
        [
          'ID',
          'Invoice number',
          'Contact email',
          'Total amount',
          'Status',
          'Issue date',
        ],
        async (businessId) => {
          const items = await this.prisma.invoice.findMany({
            where: { businessId, deletedAt: null },
            include: { contact: true },
            take: 100_000,
          });
          return items.map((i) => [
            i.id,
            i.invoiceNumber,
            i.contact?.email ?? '',
            i.totalAmount.toString(),
            i.status,
            i.issueDate.toISOString(),
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.ESTIMATE,
        [
          'ID',
          'Estimate number',
          'Contact email',
          'Total amount',
          'Status',
          'Issue date',
        ],
        async (businessId) => {
          const items = await this.prisma.estimate.findMany({
            where: { businessId, deletedAt: null },
            include: { contact: true },
            take: 100_000,
          });
          return items.map((e) => [
            e.id,
            e.estimateNumber,
            e.contact?.email ?? '',
            e.totalAmount.toString(),
            e.status,
            e.issueDate.toISOString(),
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.PAYMENT,
        ['ID', 'Contact email', 'Amount', 'Status', 'Paid at'],
        async (businessId) => {
          const items = await this.prisma.payment.findMany({
            where: { businessId, deletedAt: null },
            include: { contact: true },
            take: 100_000,
          });
          return items.map((p) => [
            p.id,
            p.contact?.email ?? '',
            p.amount.toString(),
            p.status,
            p.paidAt?.toISOString() ?? '',
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.WORK_ITEM,
        ['ID', 'Title', 'Contact email', 'Status', 'Amount'],
        async (businessId) => {
          const items = await this.prisma.workItem.findMany({
            where: { businessId, deletedAt: null },
            include: { contact: true },
            take: 100_000,
          });
          return items.map((w) => [
            w.id,
            w.title,
            w.contact?.email ?? '',
            w.status,
            w.amount?.toString() ?? '',
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.OFFER,
        ['ID', 'Name', 'Offer code', 'Enabled'],
        async (businessId) => {
          const items = await this.prisma.offer.findMany({
            where: { businessId },
            take: 100_000,
          });
          return items.map((o) => [
            o.id,
            o.name,
            o.offerCode ?? '',
            o.isEnabled ? 'true' : 'false',
          ]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.FORM_SUBMISSION,
        ['ID', 'Form ID', 'Created at'],
        async (businessId) => {
          const items = await this.prisma.formSubmission.findMany({
            where: { businessId },
            take: 100_000,
          });
          return items.map((f) => [f.id, f.formId, f.createdAt.toISOString()]);
        },
      ),
    );
    registerEntityHandler(
      exportOnlyHandler(
        DataImportEntityType.TIME_CARD,
        ['ID', 'User ID', 'Clock in', 'Clock out'],
        async (businessId) => {
          const items = await this.prisma.timeCard.findMany({
            where: { businessId },
            take: 100_000,
          });
          return items.map((t) => [
            t.id,
            t.userId,
            t.clockInTime.toISOString(),
            t.clockOutTime?.toISOString() ?? '',
          ]);
        },
      ),
    );
  }

  private async resolveContactId(businessId: string, email?: string) {
    if (!email?.trim()) return null;
    const contact = await this.prisma.contact.findFirst({
      where: {
        businessId,
        deletedAt: null,
        email: { equals: email.trim(), mode: 'insensitive' },
      },
      select: { id: true },
    });
    return contact?.id ?? null;
  }

  private leadHandler(): EntityHandler {
    return {
      entityType: DataImportEntityType.LEAD,
      fields: LEAD_FIELDS,
      supportsImport: true,
      supportsExport: true,
      templateHeaders: [
        'title',
        'contactEmail',
        'value',
        'status',
        'source',
        'notes',
      ],
      exportHeaders: [
        'ID',
        'Title',
        'Contact email',
        'Value',
        'Status',
        'Source',
        'Notes',
      ],
      importRow: async (mapped, appendNotes, ctx): Promise<ImportRowResult> => {
        const title = mapped.title?.trim() || 'Imported lead';
        const contactId = await this.resolveContactId(
          ctx.businessId,
          mapped.contactEmail,
        );
        const pipeline = await this.prisma.pipeline.findFirst({
          where: { businessId: ctx.businessId },
          include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
        });
        if (!pipeline?.stages[0]) {
          return {
            status: 'failed',
            reason: 'No pipeline/stage configured for this business',
            row: mapped,
          };
        }
        const notes = [mapped.notes, ...appendNotes].filter(Boolean).join('\n');
        const statusRaw = (mapped.status ?? 'ACTIVE').toUpperCase();
        const status =
          statusRaw in LeadStatus
            ? (statusRaw as LeadStatus)
            : LeadStatus.ACTIVE;

        const existing = contactId
          ? await this.prisma.lead.findFirst({
              where: {
                businessId: ctx.businessId,
                deletedAt: null,
                contactId,
              },
            })
          : await this.prisma.lead.findFirst({
              where: {
                businessId: ctx.businessId,
                deletedAt: null,
                title: { equals: title, mode: 'insensitive' },
              },
            });

        if (existing) {
          if (ctx.duplicatePolicy === DataImportDuplicatePolicy.SKIP) {
            return { status: 'skipped', reason: 'lead already exists' };
          }
          if (ctx.duplicatePolicy !== DataImportDuplicatePolicy.CREATE_ALWAYS) {
            await this.prisma.lead.update({
              where: { id: existing.id },
              data: {
                title,
                value: mapped.value ? Number(mapped.value) : existing.value,
                status,
                source: mapped.source?.trim() || existing.source,
                notes: notes || existing.notes,
              },
            });
            return { status: 'updated', id: existing.id };
          }
        }

        try {
          const created = await this.prisma.lead.create({
            data: {
              businessId: ctx.businessId,
              title,
              contactId,
              pipelineId: pipeline.id,
              pipelineStageId: pipeline.stages[0].id,
              value: mapped.value ? Number(mapped.value) : null,
              status,
              source: mapped.source?.trim() || ctx.providerPreset || 'csv_import',
              notes: notes || null,
              createdById: ctx.actorUserId,
            },
          });
          return { status: 'created', id: created.id };
        } catch (error) {
          return {
            status: 'failed',
            reason:
              error instanceof Error ? error.message : 'Failed to create lead',
            row: mapped,
          };
        }
      },
      exportRows: async (businessId) => {
        const items = await this.prisma.lead.findMany({
          where: { businessId, deletedAt: null },
          include: { contact: true },
          take: 100_000,
        });
        return items.map((l) => [
          l.id,
          l.title ?? '',
          l.contact?.email ?? '',
          l.value?.toString() ?? '',
          l.status,
          l.source ?? '',
          l.notes ?? '',
        ]);
      },
    };
  }

  private noteHandler(): EntityHandler {
    return {
      entityType: DataImportEntityType.NOTE,
      fields: NOTE_FIELDS,
      supportsImport: true,
      supportsExport: true,
      templateHeaders: ['title', 'description', 'contactEmail'],
      exportHeaders: ['ID', 'Title', 'Description', 'Contact email'],
      importRow: async (mapped, appendNotes, ctx): Promise<ImportRowResult> => {
        const title = mapped.title?.trim() || 'Imported note';
        const description = [mapped.description, ...appendNotes]
          .filter(Boolean)
          .join('\n');
        const contactId = await this.resolveContactId(
          ctx.businessId,
          mapped.contactEmail,
        );
        const created = await this.prisma.note.create({
          data: {
            businessId: ctx.businessId,
            title,
            description: description || '',
            contactId,
            createdById: ctx.actorUserId,
          },
        });
        return { status: 'created', id: created.id };
      },
      exportRows: async (businessId) => {
        const items = await this.prisma.note.findMany({
          where: { businessId, deletedAt: null },
          include: { contact: true },
          take: 100_000,
        });
        return items.map((n) => [
          n.id,
          n.title,
          n.description ?? '',
          n.contact?.email ?? '',
        ]);
      },
    };
  }

  private taskHandler(): EntityHandler {
    return {
      entityType: DataImportEntityType.TASK,
      fields: TASK_FIELDS,
      supportsImport: true,
      supportsExport: true,
      templateHeaders: [
        'title',
        'description',
        'status',
        'priority',
        'contactEmail',
        'dueAt',
      ],
      exportHeaders: [
        'ID',
        'Title',
        'Description',
        'Status',
        'Priority',
        'Contact email',
        'Due at',
      ],
      importRow: async (mapped, appendNotes, ctx): Promise<ImportRowResult> => {
        const title = mapped.title?.trim();
        if (!title) {
          return { status: 'failed', reason: 'Task title is required', row: mapped };
        }
        const contactId = await this.resolveContactId(
          ctx.businessId,
          mapped.contactEmail,
        );
        const statusRaw = (mapped.status ?? 'TODO').toUpperCase();
        const status =
          statusRaw in TaskStatus ? (statusRaw as TaskStatus) : TaskStatus.TODO;
        const priorityRaw = (mapped.priority ?? 'MEDIUM').toUpperCase();
        const priority =
          priorityRaw in TaskPriority
            ? (priorityRaw as TaskPriority)
            : TaskPriority.MEDIUM;
        const parsedDue = mapped.dueAt ? new Date(mapped.dueAt) : new Date();
        const dueAt =
          parsedDue && !Number.isNaN(parsedDue.getTime())
            ? parsedDue
            : new Date();
        const created = await this.prisma.task.create({
          data: {
            businessId: ctx.businessId,
            title,
            description:
              [mapped.description, ...appendNotes].filter(Boolean).join('\n') ||
              '',
            status,
            priority,
            contactId,
            dueAt,
            createdById: ctx.actorUserId,
          },
        });
        return { status: 'created', id: created.id };
      },
      exportRows: async (businessId) => {
        const items = await this.prisma.task.findMany({
          where: { businessId, deletedAt: null },
          include: { contact: true },
          take: 100_000,
        });
        return items.map((t) => [
          t.id,
          t.title,
          t.description ?? '',
          t.status,
          t.priority ?? '',
          t.contact?.email ?? '',
          t.dueAt.toISOString(),
        ]);
      },
    };
  }
}
