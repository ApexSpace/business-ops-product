import { Injectable } from '@nestjs/common';
import { Contact, ConversationChannel, Prisma } from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { MetaApiClient } from '@app/modules/integrations/integrations/meta/services/meta-api-client';
import { MetaConfigService } from '@app/modules/integrations/integrations/meta/services/meta-config.service';
import { IntegrationResource } from '@prisma/client';
import { getPageAccessTokenFromResource } from '../utils/conversation-resource-token.util';
import { NormalizedInboundMessage } from '../adapters/meta/meta-inbound.types';

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
    if (inbound.channel === ConversationChannel.EMAIL) {
      const existingByEmail = await this.contactRepository.findByEmail(
        businessId,
        inbound.externalParticipantId,
      );
      if (existingByEmail) {
        return existingByEmail;
      }
    }

    const metadataKey = this.resolveMetadataKey(inbound.channel);

    const existing = await this.contactRepository.findByMetadataExternalId(
      businessId,
      metadataKey,
      inbound.externalParticipantId,
    );

    if (existing) {
      return this.mergeContactMetadata(existing, inbound, metadataKey);
    }

    const profile = await this.fetchSenderProfile(inbound, resource);
    const displayName =
      profile.name ??
      inbound.senderName ??
      this.defaultDisplayName(inbound.channel, inbound.externalParticipantId);

    const nameParts = displayName.split(/\s+/);
    const firstName = nameParts[0] ?? displayName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    const metadata: Prisma.InputJsonValue = {
      [metadataKey]: inbound.externalParticipantId,
      channel: inbound.channel,
      profilePictureUrl:
        profile.profilePic ?? inbound.senderProfilePictureUrl ?? null,
    };

    const contact = await this.contactRepository.create(
      businessId,
      {
        firstName,
        lastName,
        displayName,
        email:
          inbound.channel === ConversationChannel.EMAIL
            ? inbound.externalParticipantId
            : undefined,
        source: this.contactSourceLabel(inbound.channel),
        avatarUrl: profile.profilePic ?? inbound.senderProfilePictureUrl ?? null,
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

  private resolveMetadataKey(
    channel: ConversationChannel,
  ): 'facebookPsid' | 'instagramUserId' | 'whatsappWaId' | 'emailAddress' {
    if (channel === ConversationChannel.FACEBOOK) return 'facebookPsid';
    if (channel === ConversationChannel.WHATSAPP) return 'whatsappWaId';
    if (channel === ConversationChannel.EMAIL) return 'emailAddress';
    return 'instagramUserId';
  }

  private defaultDisplayName(
    channel: ConversationChannel,
    externalParticipantId: string,
  ): string {
    if (channel === ConversationChannel.FACEBOOK) return 'Facebook User';
    if (channel === ConversationChannel.WHATSAPP) {
      return externalParticipantId.startsWith('+')
        ? externalParticipantId
        : `+${externalParticipantId}`;
    }
    if (channel === ConversationChannel.EMAIL) {
      return externalParticipantId;
    }
    return 'Instagram User';
  }

  private contactSourceLabel(channel: ConversationChannel): string {
    if (channel === ConversationChannel.FACEBOOK) return 'Facebook Messenger';
    if (channel === ConversationChannel.WHATSAPP) return 'WhatsApp';
    if (channel === ConversationChannel.EMAIL) return 'Email';
    return 'Instagram';
  }

  private async mergeContactMetadata(
    contact: Contact,
    inbound: NormalizedInboundMessage,
    metadataKey: 'facebookPsid' | 'instagramUserId' | 'whatsappWaId' | 'emailAddress',
  ): Promise<Contact> {
    const current = (contact.metadata as Record<string, unknown> | null) ?? {};
    if (current[metadataKey] === inbound.externalParticipantId) {
      return contact;
    }

    const updated = await this.contactRepository.update(
      contact.businessId,
      contact.id,
      {
        metadata: {
          ...current,
          [metadataKey]: inbound.externalParticipantId,
          channel: inbound.channel,
        } as Prisma.InputJsonValue,
      },
    );

    return updated ?? contact;
  }

  private async fetchSenderProfile(
    inbound: NormalizedInboundMessage,
    resource: IntegrationResource,
  ): Promise<{ name?: string; profilePic?: string }> {
    if (inbound.channel === ConversationChannel.WHATSAPP) {
      return inbound.senderName ? { name: inbound.senderName } : {};
    }

    if (inbound.channel !== ConversationChannel.FACEBOOK) {
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
      return await this.metaApiClient.getMessengerUserProfile(
        inbound.externalParticipantId,
        pageAccessToken,
      );
    } catch {
      return {};
    }
  }
}
