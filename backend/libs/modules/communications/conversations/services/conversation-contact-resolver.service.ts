import { Injectable } from '@nestjs/common';
import { Contact, ConversationChannel, Prisma } from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { MetaApiClient } from '@app/modules/integrations/integrations/meta/services/meta-api-client';
import { MetaConfigService } from '@app/modules/integrations/integrations/meta/services/meta-config.service';
import { IntegrationResource } from '@prisma/client';
import { NormalizedInboundMessage } from '../adapters/meta/meta-inbound.types';
import {
  buildInboundContactIdentity,
  ChannelMetadataKey,
  contactSourceLabel,
  defaultInboundDisplayName,
  InboundContactIdentity,
  resolveChannelMetadataKey,
  SenderProfileSnapshot,
} from '../utils/contact-channel-identity.util';
import { getPageAccessTokenFromResource } from '../utils/conversation-resource-token.util';

@Injectable()
export class ConversationContactResolverService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly metaApiClient: MetaApiClient,
    private readonly metaConfigService: MetaConfigService,
    private readonly auditService: AuditService,
  ) {}

  async resolveOrCreateContact(
    businessId: string,
    inbound: NormalizedInboundMessage,
    resource: IntegrationResource,
  ): Promise<Contact> {
    const metadataKey = resolveChannelMetadataKey(inbound.channel);
    const profile = await this.fetchSenderProfile(inbound, resource);
    const identity = buildInboundContactIdentity(inbound, profile);

    const existing = await this.findExistingContact(
      businessId,
      inbound,
      metadataKey,
      identity,
    );

    if (existing) {
      return this.enrichExistingContact(
        existing,
        inbound,
        metadataKey,
        identity,
        profile,
      );
    }

    return this.createContactFromInbound(
      businessId,
      inbound,
      metadataKey,
      identity,
      profile,
    );
  }

  private async findExistingContact(
    businessId: string,
    inbound: NormalizedInboundMessage,
    metadataKey: ChannelMetadataKey,
    identity: InboundContactIdentity,
  ): Promise<Contact | null> {
    if (identity.email) {
      const byEmail = await this.contactRepository.findByEmail(
        businessId,
        identity.email,
      );
      if (byEmail) {
        return byEmail;
      }
    }

    if (identity.phoneKey) {
      const byPhone = await this.contactRepository.findByPhoneKey(
        businessId,
        identity.phoneKey,
      );
      if (byPhone) {
        return byPhone;
      }
    }

    return this.contactRepository.findByMetadataExternalId(
      businessId,
      metadataKey,
      inbound.externalParticipantId,
    );
  }

  private async enrichExistingContact(
    contact: Contact,
    inbound: NormalizedInboundMessage,
    metadataKey: ChannelMetadataKey,
    identity: InboundContactIdentity,
    profile: SenderProfileSnapshot,
  ): Promise<Contact> {
    const current = (contact.metadata as Record<string, unknown> | null) ?? {};
    const profilePic =
      profile.profilePic ?? inbound.senderProfilePictureUrl ?? null;

    const metadata: Prisma.InputJsonValue = {
      ...current,
      [metadataKey]: inbound.externalParticipantId,
      channel: inbound.channel,
      ...(profilePic ? { profilePictureUrl: profilePic } : {}),
    };

    const displayName =
      profile.name ??
      inbound.senderName ??
      contact.displayName ??
      defaultInboundDisplayName(
        inbound.channel,
        inbound.externalParticipantId,
      );

    const nameParts = displayName.split(/\s+/);
    const firstName = nameParts[0] ?? displayName;
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(' ') : contact.lastName;

    const updateData: Prisma.ContactUpdateInput = {
      metadata,
      ...(identity.email && !contact.email ? { email: identity.email } : {}),
      ...(!contact.phoneNumber && identity.phoneFields.phoneNumber
        ? {
            phoneCountryCode: identity.phoneFields.phoneCountryCode,
            phoneNumber: identity.phoneFields.phoneNumber,
          }
        : {}),
      ...(!contact.displayName && displayName ? { displayName } : {}),
      ...(!contact.firstName && firstName ? { firstName } : {}),
      ...(contact.lastName == null && lastName ? { lastName } : {}),
      ...(!contact.avatarUrl && profilePic ? { avatarUrl: profilePic } : {}),
    };

    const hasMetadataChange = current[metadataKey] !== inbound.externalParticipantId;
    const hasFieldChange =
      Boolean(identity.email && !contact.email) ||
      Boolean(!contact.phoneNumber && identity.phoneFields.phoneNumber) ||
      Boolean(!contact.avatarUrl && profilePic);

    if (!hasMetadataChange && !hasFieldChange) {
      return contact;
    }

    const updated = await this.contactRepository.update(
      contact.businessId,
      contact.id,
      updateData,
    );

    return updated ?? contact;
  }

  private async createContactFromInbound(
    businessId: string,
    inbound: NormalizedInboundMessage,
    metadataKey: ChannelMetadataKey,
    identity: InboundContactIdentity,
    profile: SenderProfileSnapshot,
  ): Promise<Contact> {
    const displayName =
      profile.name ??
      inbound.senderName ??
      defaultInboundDisplayName(
        inbound.channel,
        inbound.externalParticipantId,
      );

    const nameParts = displayName.split(/\s+/);
    const firstName = nameParts[0] ?? displayName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    const profilePic =
      profile.profilePic ?? inbound.senderProfilePictureUrl ?? null;

    const metadata: Prisma.InputJsonValue = {
      [metadataKey]: inbound.externalParticipantId,
      channel: inbound.channel,
      profilePictureUrl: profilePic,
    };

    const contact = await this.contactRepository.create(
      businessId,
      {
        firstName,
        lastName,
        displayName,
        email: identity.email ?? undefined,
        phoneCountryCode: identity.phoneFields.phoneCountryCode ?? undefined,
        phoneNumber: identity.phoneFields.phoneNumber ?? undefined,
        source: contactSourceLabel(inbound.channel),
        avatarUrl: profilePic,
        metadata,
      },
      SYSTEM_AUDIT_ACTOR_SENTINEL,
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId,
      action: 'contact.created',
      entityType: 'Contact',
      entityId: contact.id,
      metadata: { source: 'conversation.inbound', channel: inbound.channel },
    });

    return contact;
  }

  private async fetchSenderProfile(
    inbound: NormalizedInboundMessage,
    resource: IntegrationResource,
  ): Promise<SenderProfileSnapshot> {
    if (inbound.channel === ConversationChannel.WHATSAPP) {
      return inbound.senderName ? { name: inbound.senderName } : {};
    }

    if (inbound.channel === ConversationChannel.EMAIL) {
      return {};
    }

    const pageAccessToken = getPageAccessTokenFromResource(
      resource,
      this.metaConfigService.getEncryptionKey(),
    );
    if (!pageAccessToken) {
      return {};
    }

    try {
      if (inbound.channel === ConversationChannel.FACEBOOK) {
        return await this.metaApiClient.getMessengerUserProfile(
          inbound.externalParticipantId,
          pageAccessToken,
        );
      }

      if (inbound.channel === ConversationChannel.INSTAGRAM) {
        return await this.metaApiClient.getInstagramUserProfile(
          inbound.externalParticipantId,
          pageAccessToken,
        );
      }
    } catch {
      return {};
    }

    return {};
  }
}
