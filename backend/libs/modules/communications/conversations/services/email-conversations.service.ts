import { randomUUID } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationDirection,
  ConversationStatus,
  IntegrationResourceType,
  IntegrationStatus,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { EMAIL_PROVIDER_KEY } from '@app/modules/communications/email/constants/email-platform.constants';
import { PlatformEmailProvisioningService } from '@app/modules/integrations/integrations/email/services/platform-email-provisioning.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { StartEmailConversationDto } from '../dto/start-email-conversation.dto';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { toConversationResponse } from '../mappers/conversation.mapper';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { ConversationMessagesService } from './conversation-messages.service';

@Injectable()
export class EmailConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly contactRepository: ContactRepository,
    private readonly platformEmailProvisioning: PlatformEmailProvisioningService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly conversationMessagesService: ConversationMessagesService,
  ) {}

  async startConversation(
    businessId: string,
    dto: StartEmailConversationDto,
    actor: RequestUser,
  ) {
    const provisioned =
      await this.platformEmailProvisioning.ensurePlatformDefaultEmail(businessId);
    if (!provisioned) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Platform email is not configured on the server.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const toEmail = dto.toEmail.trim().toLowerCase();
    if (!toEmail) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Recipient email is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        EMAIL_PROVIDER_KEY,
      );
    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Platform email is not connected for this business.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const resource = await this.integrationResourceRepository.findDefault(
      businessId,
      EMAIL_PROVIDER_KEY,
      IntegrationResourceType.EMAIL_ACCOUNT,
    );
    if (!resource) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'No default email address is configured for this business.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const metadata = (resource.metadata ?? {}) as Record<string, unknown>;
    const fromAddress =
      typeof metadata.fromAddress === 'string' ? metadata.fromAddress : null;
    if (!fromAddress) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Email from address is missing on the default resource.',
        HttpStatus.BAD_REQUEST,
      );
    }

    let contact =
      (dto.contactId
        ? await this.contactRepository.findById(businessId, dto.contactId)
        : null) ??
      (await this.contactRepository.findByEmail(businessId, toEmail));

    if (!contact) {
      const localPart = toEmail.split('@')[0] ?? toEmail;
      contact = await this.contactRepository.create(
        businessId,
        {
          firstName: localPart,
          lastName: null,
          displayName: localPart,
          email: toEmail,
          source: 'Email',
          metadata: {
            emailAddress: toEmail,
            channel: ConversationChannel.EMAIL,
          } as Prisma.InputJsonValue,
        },
        SYSTEM_AUDIT_ACTOR_SENTINEL,
      );
    }

    const existing =
      await this.conversationsRepository.findByExternalParticipantId(
        businessId,
        ConversationChannel.EMAIL,
        toEmail,
      );

    if (existing) {
      const response: ConversationResponseDto = toConversationResponse(existing);
      if (dto.text?.trim()) {
        await this.conversationMessagesService.send(
          businessId,
          existing.id,
          { text: dto.text.trim(), subject: dto.subject },
          actor,
        );
      }
      return response;
    }

    const conversationId = randomUUID();
    const conversation = await this.conversationsRepository.create({
      id: conversationId,
      business: { connect: { id: businessId } },
      contact: { connect: { id: contact.id } },
      channel: ConversationChannel.EMAIL,
      providerKey: EMAIL_PROVIDER_KEY,
      resourceId: resource.id,
      externalConversationId: conversationId,
      externalParticipantId: toEmail,
      externalPageId: fromAddress,
      title: dto.subject?.trim() || toEmail,
      status: ConversationStatus.OPEN,
      lastMessageAt: new Date(),
      lastMessagePreview: dto.text?.trim()?.slice(0, 500) ?? null,
      unreadCount: 0,
      metadata: {
        subject: dto.subject?.trim() ?? null,
      } as Prisma.InputJsonValue,
    });

    if (dto.text?.trim()) {
      await this.conversationMessagesService.send(
        businessId,
        conversation.id,
        { text: dto.text.trim(), subject: dto.subject },
        actor,
      );
    }

    return toConversationResponse(conversation);
  }
}
