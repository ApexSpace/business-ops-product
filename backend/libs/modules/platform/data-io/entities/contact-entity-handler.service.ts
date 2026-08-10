import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DataImportDuplicatePolicy,
  DataImportEntityType,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { TagRepository } from '@app/modules/crm/contacts/repositories/tag.repository';
import { normalizePhoneKey } from '@app/modules/crm/contacts/utils/contact-profile.util';
import { toContactCreateData } from '@app/modules/crm/contacts/utils/contact-profile-data.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CONTACT_FIELDS,
  CONTACT_PROVIDER_ALIASES,
} from './contact.fields';
import {
  registerEntityHandler,
  type EntityHandler,
  type EntityImportContext,
  type ImportRowResult,
} from './entity-registry';
import {
  isLikelyExportMetadataContact,
  isValidEmail,
  parsePhoneParts,
  splitFullName,
  splitTags,
} from '../mapping/row-utils';

@Injectable()
export class ContactEntityHandlerService implements OnModuleInit {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly tagRepository: TagRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit(): void {
    registerEntityHandler(this.asHandler());
  }

  asHandler(): EntityHandler {
    return {
      entityType: DataImportEntityType.CONTACT,
      fields: CONTACT_FIELDS,
      providerAliases: CONTACT_PROVIDER_ALIASES,
      supportsImport: true,
      supportsExport: true,
      templateHeaders: [
        'firstName',
        'lastName',
        'email',
        'phone',
        'companyName',
        'address',
        'city',
        'state',
        'country',
        'zip',
        'timezone',
        'clientNotes',
        'source',
        'tags',
      ],
      exportHeaders: [
        'ID',
        'First name',
        'Last name',
        'Display name',
        'Company name',
        'Email',
        'Phone',
        'Timezone',
        'Address',
        'City',
        'State',
        'Country',
        'Zipcode',
        'Notes',
        'Source',
        'Tags',
      ],
      importRow: (mapped, appendNotes, ctx) =>
        this.importRow(mapped, appendNotes, ctx),
      exportRows: (businessId, filters) =>
        this.exportRows(businessId, filters?.search),
    };
  }

  private async importRow(
    mapped: Record<string, string>,
    appendNotes: string[],
    ctx: EntityImportContext,
  ): Promise<ImportRowResult> {
    const fields = { ...mapped };

    if (fields.fullName && !fields.firstName && !fields.lastName) {
      const split = splitFullName(fields.fullName);
      fields.firstName = split.firstName;
      fields.lastName = split.lastName;
    }

    if (fields.phone && !fields.phoneNumber) {
      const parts = parsePhoneParts(fields.phone);
      if (parts.phoneCountryCode) fields.phoneCountryCode = parts.phoneCountryCode;
      if (parts.phoneNumber) fields.phoneNumber = parts.phoneNumber;
    }

    const email = fields.email?.trim().toLowerCase() || undefined;
    if (email && !isValidEmail(email)) {
      return { status: 'failed', reason: 'Invalid email format', row: mapped };
    }

    const firstName = fields.firstName?.trim() || undefined;
    const lastName = fields.lastName?.trim() || undefined;
    const phoneCountryCode = fields.phoneCountryCode?.trim() || undefined;
    const phoneNumber = fields.phoneNumber?.trim() || undefined;

    if (
      isLikelyExportMetadataContact({
        firstName,
        lastName,
        displayName: fields.displayName,
      })
    ) {
      return {
        status: 'skipped',
        reason: 'row looks like export/report metadata, not a contact',
      };
    }

    if (!firstName && !lastName && !email && !phoneNumber) {
      return {
        status: 'failed',
        reason:
          'Row needs at least one of firstName, lastName, email, or phone',
        row: mapped,
      };
    }

    let notes = fields.clientNotes?.trim() || '';
    if (appendNotes.length > 0) {
      notes = [notes, ...appendNotes].filter(Boolean).join('\n');
    }

    const tagNames =
      ctx.autoCreateTags === false
        ? []
        : splitTags(fields.tags ?? '');
    const tagIds: string[] = [];
    for (const name of tagNames) {
      let tag = await this.tagRepository.findByName(ctx.businessId, name);
      if (!tag && ctx.autoCreateTags !== false) {
        tag = await this.tagRepository.create(ctx.businessId, name);
      }
      if (tag) tagIds.push(tag.id);
    }

    const phoneKey = normalizePhoneKey(phoneCountryCode, phoneNumber);
    const existingById = fields.id
      ? await this.contactRepository.findById(ctx.businessId, fields.id)
      : null;

    let existing =
      existingById ??
      (email
        ? await this.contactRepository.findByEmail(ctx.businessId, email)
        : null);

    if (!existing && phoneKey) {
      existing = await this.contactRepository.findByPhoneKey(
        ctx.businessId,
        phoneKey,
      );
    }

    // Soft-deleted match
    if (!existing && (email || phoneKey || fields.id)) {
      const deleted = await this.findDeletedMatch(
        ctx.businessId,
        fields.id,
        email,
        phoneKey,
      );
      if (deleted) {
        if (ctx.restoreDeleted) {
          await this.prisma.contact.update({
            where: { id: deleted.id },
            data: { deletedAt: null },
          });
          existing = await this.contactRepository.findById(
            ctx.businessId,
            deleted.id,
          );
        } else {
          return {
            status: 'skipped',
            reason: 'matches a deleted contact',
          };
        }
      }
    }

    const source =
      fields.source?.trim() ||
      (ctx.providerPreset
        ? `${ctx.providerPreset}_import`
        : 'csv_import');

    const profile = {
      firstName,
      lastName,
      displayName: fields.displayName?.trim() || undefined,
      companyName: fields.companyName?.trim() || undefined,
      email,
      phoneCountryCode,
      phoneNumber,
      timezone: fields.timezone?.trim() || ctx.timezoneDefault || undefined,
      address: fields.address?.trim() || undefined,
      city: fields.city?.trim() || undefined,
      state: fields.state?.trim() || undefined,
      country: fields.country?.trim() || undefined,
      zip: fields.zip?.trim() || undefined,
      clientNotes: notes || undefined,
      source,
    };

    if (existing) {
      if (ctx.duplicatePolicy === DataImportDuplicatePolicy.SKIP) {
        return { status: 'skipped', reason: 'contact already exists' };
      }
      if (ctx.duplicatePolicy === DataImportDuplicatePolicy.CREATE_ALWAYS) {
        // fall through to create
      } else {
        // UPDATE
        await this.prisma.contact.update({
          where: { id: existing.id },
          data: {
            firstName: profile.firstName ?? existing.firstName,
            lastName: profile.lastName ?? existing.lastName,
            displayName:
              profile.displayName ??
              existing.displayName ??
              ([profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
                existing.displayName),
            companyName: profile.companyName ?? existing.companyName,
            email: profile.email ?? existing.email,
            phoneCountryCode:
              profile.phoneCountryCode ?? existing.phoneCountryCode,
            phoneNumber: profile.phoneNumber ?? existing.phoneNumber,
            timezone: profile.timezone ?? existing.timezone,
            address: profile.address ?? existing.address,
            city: profile.city ?? existing.city,
            state: profile.state ?? existing.state,
            country: profile.country ?? existing.country,
            zip: profile.zip ?? existing.zip,
            clientNotes: profile.clientNotes ?? existing.clientNotes,
            source: profile.source ?? existing.source,
          },
        });
        if (tagIds.length > 0) {
          await this.contactRepository.setTags(existing.id, tagIds);
        }
        return { status: 'updated', id: existing.id };
      }
    }

    const created = await this.contactRepository.create(
      ctx.businessId,
      toContactCreateData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        companyName: profile.companyName,
        email: profile.email,
        phoneCountryCode: profile.phoneCountryCode,
        phoneNumber: profile.phoneNumber,
        timezone: profile.timezone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        zip: profile.zip,
        source: profile.source,
      }),
      ctx.actorUserId,
    );

    if (profile.clientNotes) {
      await this.prisma.contact.update({
        where: { id: created.id },
        data: { clientNotes: profile.clientNotes },
      });
    }

    if (tagIds.length > 0) {
      await this.contactRepository.setTags(created.id, tagIds);
    }

    await this.auditService.log({
      actorUserId: ctx.actorUserId,
      businessId: ctx.businessId,
      action: 'contact.imported',
      entityType: 'Contact',
      entityId: created.id,
      metadata: { source: profile.source },
    });

    return { status: 'created', id: created.id };
  }

  private async findDeletedMatch(
    businessId: string,
    id?: string,
    email?: string,
    phoneKey?: string | null,
  ) {
    if (id) {
      const byId = await this.prisma.contact.findFirst({
        where: { businessId, id, deletedAt: { not: null } },
      });
      if (byId) return byId;
    }
    if (email) {
      const byEmail = await this.prisma.contact.findFirst({
        where: {
          businessId,
          deletedAt: { not: null },
          email: { equals: email, mode: 'insensitive' },
        },
      });
      if (byEmail) return byEmail;
    }
    if (phoneKey) {
      const candidates = await this.prisma.contact.findMany({
        where: {
          businessId,
          deletedAt: { not: null },
          phoneNumber: { not: null },
        },
        select: {
          id: true,
          phoneCountryCode: true,
          phoneNumber: true,
          deletedAt: true,
        },
      });
      const match = candidates.find(
        (c) =>
          normalizePhoneKey(c.phoneCountryCode, c.phoneNumber) === phoneKey,
      );
      if (match) {
        return this.prisma.contact.findFirst({ where: { id: match.id } });
      }
    }
    return null;
  }

  private async exportRows(
    businessId: string,
    search?: string,
  ): Promise<string[][]> {
    const contacts = await this.prisma.contact.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100_000,
    });

    return contacts
      .filter(
        (c) =>
          !isLikelyExportMetadataContact({
            firstName: c.firstName,
            lastName: c.lastName,
            displayName: c.displayName,
          }),
      )
      .map((c) => {
        const phone = [c.phoneCountryCode, c.phoneNumber]
          .filter(Boolean)
          .join(' ')
          .trim();
        return [
          c.id,
          c.firstName ?? '',
          c.lastName ?? '',
          c.displayName ?? '',
          c.companyName ?? '',
          c.email ?? '',
          phone,
          c.timezone ?? '',
          c.address ?? '',
          c.city ?? '',
          c.state ?? '',
          c.country ?? '',
          c.zip ?? '',
          c.clientNotes ?? '',
          c.source ?? '',
          c.tags.map((t) => t.tag.name).join('; '),
        ];
      });
  }
}
