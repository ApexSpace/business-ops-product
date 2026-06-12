import { Injectable, Logger } from '@nestjs/common';
import { Contact, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  buildCanonicalContactUpdate,
  groupContactsByEmail,
  groupContactsByPhone,
  pickCanonicalContact,
} from '../utils/contact-identity-merge.util';

export interface ContactIdentityBackfillOptions {
  businessId?: string;
  dryRun?: boolean;
  includePhone?: boolean;
}

export interface ContactIdentityBackfillSkip {
  contactIds: string[];
  reason: string;
}

export interface ContactIdentityBackfillBusinessResult {
  businessId: string;
  emailGroupsProcessed: number;
  phoneGroupsProcessed: number;
  contactsMerged: number;
  conversationsReassigned: number;
  referencesReassigned: number;
  contactsSoftDeleted: number;
  skipped: ContactIdentityBackfillSkip[];
}

export interface ContactIdentityBackfillResult {
  dryRun: boolean;
  businesses: ContactIdentityBackfillBusinessResult[];
}

@Injectable()
export class ContactIdentityBackfillService {
  private readonly logger = new Logger(ContactIdentityBackfillService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(
    options: ContactIdentityBackfillOptions = {},
  ): Promise<ContactIdentityBackfillResult> {
    const dryRun = options.dryRun ?? false;
    const includePhone = options.includePhone ?? true;

    const businessIds = options.businessId
      ? [options.businessId]
      : (
          await this.prisma.business.findMany({
            select: { id: true },
            orderBy: { createdAt: 'asc' },
          })
        ).map((row) => row.id);

    const businesses: ContactIdentityBackfillBusinessResult[] = [];

    for (const businessId of businessIds) {
      businesses.push(
        await this.processBusiness(businessId, { dryRun, includePhone }),
      );
    }

    return { dryRun, businesses };
  }

  private async processBusiness(
    businessId: string,
    options: { dryRun: boolean; includePhone: boolean },
  ): Promise<ContactIdentityBackfillBusinessResult> {
    const contacts = await this.prisma.contact.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    const result: ContactIdentityBackfillBusinessResult = {
      businessId,
      emailGroupsProcessed: 0,
      phoneGroupsProcessed: 0,
      contactsMerged: 0,
      conversationsReassigned: 0,
      referencesReassigned: 0,
      contactsSoftDeleted: 0,
      skipped: [],
    };

    const mergedContactIds = new Set<string>();

    for (const group of groupContactsByEmail(contacts).values()) {
      if (group.length < 2) continue;
      result.emailGroupsProcessed += 1;
      await this.mergeContactGroup(businessId, group, mergedContactIds, options, result);
    }

    if (options.includePhone) {
      const remaining = contacts.filter((contact) => !mergedContactIds.has(contact.id));
      for (const group of groupContactsByPhone(remaining).values()) {
        if (group.length < 2) continue;
        result.phoneGroupsProcessed += 1;
        await this.mergeContactGroup(
          businessId,
          group,
          mergedContactIds,
          options,
          result,
        );
      }
    }

    return result;
  }

  private async mergeContactGroup(
    businessId: string,
    group: Contact[],
    mergedContactIds: Set<string>,
    options: { dryRun: boolean },
    result: ContactIdentityBackfillBusinessResult,
  ): Promise<void> {
    const activeGroup = group.filter((contact) => !mergedContactIds.has(contact.id));
    if (activeGroup.length < 2) {
      return;
    }

    const canonical = pickCanonicalContact(activeGroup);
    const duplicates = activeGroup.filter((contact) => contact.id !== canonical.id);

    const blockReason = await this.findMergeBlockReason(canonical.id, duplicates);
    if (blockReason) {
      result.skipped.push({
        contactIds: duplicates.map((contact) => contact.id),
        reason: blockReason,
      });
      return;
    }

    if (options.dryRun) {
      result.contactsMerged += duplicates.length;
      const conversationCount = await this.prisma.conversation.count({
        where: {
          businessId,
          contactId: { in: duplicates.map((contact) => contact.id) },
        },
      });
      result.conversationsReassigned += conversationCount;
      duplicates.forEach((contact) => mergedContactIds.add(contact.id));
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const update = buildCanonicalContactUpdate(canonical, duplicates);
      await tx.contact.update({
        where: { id: canonical.id },
        data: update,
      });

      for (const duplicate of duplicates) {
        const conversationUpdates = await tx.conversation.updateMany({
          where: { businessId, contactId: duplicate.id },
          data: { contactId: canonical.id },
        });
        result.conversationsReassigned += conversationUpdates.count;

        const referenceUpdates = await this.reassignContactReferences(
          tx,
          businessId,
          duplicate.id,
          canonical.id,
        );
        result.referencesReassigned += referenceUpdates;

        await this.mergeContactTags(tx, duplicate.id, canonical.id);

        await tx.contact.update({
          where: { id: duplicate.id },
          data: {
            deletedAt: new Date(),
            metadata: {
              ...(asMetadata(duplicate.metadata) ?? {}),
              mergedIntoContactId: canonical.id,
              mergedAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });

        result.contactsSoftDeleted += 1;
        mergedContactIds.add(duplicate.id);
      }

      result.contactsMerged += duplicates.length;
    });

    this.logger.log(
      `Merged ${duplicates.length} duplicate contact(s) into ${canonical.id} for business ${businessId}`,
    );
  }

  private async findMergeBlockReason(
    canonicalId: string,
    duplicates: Contact[],
  ): Promise<string | null> {
    const canonicalLead = await this.prisma.lead.findFirst({
      where: { contactId: canonicalId },
      select: { id: true },
    });

    for (const duplicate of duplicates) {
      const duplicateLead = await this.prisma.lead.findFirst({
        where: { contactId: duplicate.id },
        select: { id: true },
      });

      if (canonicalLead && duplicateLead) {
        return `Both canonical contact ${canonicalId} and duplicate ${duplicate.id} have leads`;
      }
    }

    return null;
  }

  private async reassignContactReferences(
    tx: Prisma.TransactionClient,
    businessId: string,
    fromContactId: string,
    toContactId: string,
  ): Promise<number> {
    const updates = await Promise.all([
      tx.conversationMessage.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.conversationParticipant.updateMany({
        where: { contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.emailMessage.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.note.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.task.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.workItem.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.estimate.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.invoice.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.payment.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.appointment.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
      tx.chatbotSession.updateMany({
        where: { businessId, contactId: fromContactId },
        data: { contactId: toContactId },
      }),
    ]);

    let total = updates.reduce((sum, row) => sum + row.count, 0);

    const duplicateLead = await tx.lead.findFirst({
      where: { contactId: fromContactId },
      select: { id: true },
    });
    const canonicalLead = await tx.lead.findFirst({
      where: { contactId: toContactId },
      select: { id: true },
    });

    if (duplicateLead && !canonicalLead) {
      const leadUpdate = await tx.lead.updateMany({
        where: { id: duplicateLead.id },
        data: { contactId: toContactId },
      });
      total += leadUpdate.count;
    }

    return total;
  }

  private async mergeContactTags(
    tx: Prisma.TransactionClient,
    fromContactId: string,
    toContactId: string,
  ): Promise<void> {
    const duplicateTags = await tx.contactTag.findMany({
      where: { contactId: fromContactId },
      select: { tagId: true },
    });

    if (duplicateTags.length === 0) {
      return;
    }

    await tx.contactTag.createMany({
      data: duplicateTags.map((row) => ({
        contactId: toContactId,
        tagId: row.tagId,
      })),
      skipDuplicates: true,
    });
  }
}

function asMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
