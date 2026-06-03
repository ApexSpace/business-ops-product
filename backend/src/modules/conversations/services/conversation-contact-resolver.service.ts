import { Injectable } from '@nestjs/common';
import { Contact, ConversationChannel, Prisma } from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/services/audit.service';
import { ContactRepository } from '../../contacts/repositories/contact.repository';
import { MetaApiClient } from '../../integrations/meta/services/meta-api-client';
import { MetaConfigService } from '../../integrations/meta/services/meta-config.service';
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
    const metadataKey =
      inbound.channel === ConversationChannel.FACEBOOK
        ? 'facebookPsid'
        : 'instagramUserId';

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
      (inbound.channel === ConversationChannel.FACEBOOK
        ? 'Facebook User'
        : 'Instagram User');

    const nameParts = displayName.split(/\s+/);
    const firstName = nameParts[0] ?? displayName;
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

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
        source:
          inbound.channel === ConversationChannel.FACEBOOK
            ? 'Facebook Messenger'
            : 'Instagram',
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

  private async mergeContactMetadata(
    contact: Contact,
    inbound: NormalizedInboundMessage,
    metadataKey: 'facebookPsid' | 'instagramUserId',
  ): Promise<Contact> {
    const current =
      (contact.metadata as Record<string, unknown> | null) ?? {};
    if (current[metadataKey] === inbound.externalParticipantId) {
      return contact;
    }

    const updated = await this.contactRepository.update(contact.businessId, contact.id, {
      metadata: {
        ...current,
        [metadataKey]: inbound.externalParticipantId,
        channel: inbound.channel,
      } as Prisma.InputJsonValue,
    });

    return updated ?? contact;
  }

  private async fetchSenderProfile(
    inbound: NormalizedInboundMessage,
    resource: IntegrationResource,
  ): Promise<{ name?: string; profilePic?: string }> {
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
