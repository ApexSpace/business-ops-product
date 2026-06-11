import { Injectable } from '@nestjs/common';
import { Contact, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { normalizePhoneKey } from '../utils/contact-profile.util';

const contactWithTags = {
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.ContactInclude;

export type ContactWithTags = Prisma.ContactGetPayload<{
  include: typeof contactWithTags;
}>;

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ContactWhereInput,
  ): Prisma.ContactWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...extra,
    };
  }

  findById(businessId: string, id: string): Promise<ContactWithTags | null> {
    return this.prisma.contact.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: contactWithTags,
    });
  }

  findMany(
    businessId: string,
    params: { skip: number; take: number; search?: string },
  ): Promise<{ items: ContactWithTags[]; total: number }> {
    const where = this.activeWhere(
      businessId,
      params.search
        ? {
            OR: [
              {
                firstName: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                displayName: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                companyName: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                email: { contains: params.search, mode: 'insensitive' },
              },
              {
                phoneNumber: { contains: params.search, mode: 'insensitive' },
              },
              {
                phoneCountryCode: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
    );

    return Promise.all([
      this.prisma.contact.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: contactWithTags,
      }),
      this.prisma.contact.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findByEmail(
    businessId: string,
    email: string,
    excludeId?: string,
  ): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: this.activeWhere(businessId, {
        email: { equals: email, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      }),
    });
  }

  findByMetadataExternalId(
    businessId: string,
    metadataKey: 'facebookPsid' | 'instagramUserId' | 'whatsappWaId' | 'emailAddress',
    externalId: string,
  ): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: this.activeWhere(businessId, {
        metadata: {
          path: [metadataKey],
          equals: externalId,
        },
      }),
      include: contactWithTags,
    });
  }

  findByChatbotVisitorId(
    businessId: string,
    visitorId: string,
  ): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: this.activeWhere(businessId, {
        metadata: {
          path: ['visitorId'],
          equals: visitorId,
        },
      }),
    });
  }

  async findByPhoneKey(
    businessId: string,
    phoneKey: string,
    excludeId?: string,
  ): Promise<Contact | null> {
    const contacts = await this.prisma.contact.findMany({
      where: this.activeWhere(businessId, {
        phoneNumber: { not: null },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      }),
      select: {
        id: true,
        phoneCountryCode: true,
        phoneNumber: true,
      },
    });

    const match = contacts.find(
      (c) => normalizePhoneKey(c.phoneCountryCode, c.phoneNumber) === phoneKey,
    );

    if (!match) {
      return null;
    }

    return this.prisma.contact.findFirst({
      where: { id: match.id },
    });
  }

  create(
    businessId: string,
    data: Omit<Prisma.ContactCreateInput, 'business' | 'createdBy' | 'tags'>,
    createdById: string,
  ): Promise<ContactWithTags> {
    return this.prisma.contact.create({
      data: {
        ...data,
        business: { connect: { id: businessId } },
        ...(createdById !== SYSTEM_AUDIT_ACTOR_SENTINEL
          ? { createdBy: { connect: { id: createdById } } }
          : {}),
      },
      include: contactWithTags,
    });
  }

  createPublic(
    businessId: string,
    data: Omit<Prisma.ContactCreateInput, 'business' | 'createdBy' | 'tags'>,
  ): Promise<Contact> {
    return this.prisma.contact.create({
      data: {
        ...data,
        business: { connect: { id: businessId } },
      },
    });
  }

  touchUpdatedAt(businessId: string, id: string): Promise<void> {
    return this.prisma.contact
      .updateMany({
        where: this.activeWhere(businessId, { id }),
        data: { updatedAt: new Date() },
      })
      .then(() => undefined);
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ContactUpdateInput,
  ): Promise<ContactWithTags | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.contact.update({
      where: { id },
      data,
      include: contactWithTags,
    });
  }

  async softDelete(businessId: string, id: string): Promise<Contact | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async setTags(contactId: string, tagIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.contactTag.deleteMany({ where: { contactId } }),
      ...(tagIds.length > 0
        ? [
            this.prisma.contactTag.createMany({
              data: tagIds.map((tagId) => ({ contactId, tagId })),
            }),
          ]
        : []),
    ]);
  }
}
